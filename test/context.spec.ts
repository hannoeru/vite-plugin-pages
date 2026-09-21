import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { PageContext } from '../src/context'

describe('page context', () => {
  it('applies file patterns when page files change', async () => {
    const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    mkdirSync(join(root, 'pages'))

    try {
      const ctx = new PageContext({
        resolver: 'react',
        dirs: [
          { dir: 'pages', baseRoute: 'app', filePattern: '**/*.page.tsx' },
          { dir: 'pages', baseRoute: 'admin', filePattern: '**/*.view.tsx' },
        ],
      }, root)
      const helper = `${root}/pages/helper.tsx`
      writeFileSync(helper, 'export default () => null')
      await ctx.searchGlob()
      expect(ctx.pageRouteMap.size).toBe(0)

      for (const type of ['create', 'update', 'delete'] as const) {
        expect(await ctx.handleFileChange(type, helper)).toBe(false)
        expect(ctx.pageRouteMap.size).toBe(0)
      }

      const path = `${root}/pages/home.view.tsx`
      writeFileSync(path, 'export default () => null')
      expect(await ctx.handleFileChange('create', path)).toBe(true)
      expect(ctx.pageRouteMap.get(path)?.route).toBe('admin/home.view')

      const scanned = new PageContext(ctx.rawOptions, root)
      await scanned.searchGlob()
      expect(ctx.pageRouteMap).toEqual(scanned.pageRouteMap)

      rmSync(path)
      expect(await ctx.handleFileChange('delete', path)).toBe(true)
      expect(ctx.pageRouteMap.size).toBe(0)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('uses the matching directory for new pages with a shared directory prefix', async () => {
    const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    mkdirSync(join(root, 'pages'))
    mkdirSync(join(root, 'pages-extra'))

    try {
      const ctx = new PageContext({
        resolver: 'react',
        dirs: [
          { dir: 'pages', baseRoute: '' },
          { dir: 'pages-extra', baseRoute: 'extra' },
        ],
      }, root)
      const path = `${root}/pages-extra/home.tsx`
      writeFileSync(path, 'export default () => null')
      expect(await ctx.handleFileChange('create', path)).toBe(true)
      expect(ctx.pageRouteMap.get(path)?.route).toBe('extra/home')

      mkdirSync(join(root, 'pages-backup'))
      const ignoredPath = `${root}/pages-backup/home.tsx`
      writeFileSync(ignoredPath, 'export default () => null')
      expect(await ctx.handleFileChange('create', ignoredPath)).toBe(false)
      expect(ctx.pageRouteMap.has(ignoredPath)).toBe(false)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('tracks concurrent route metadata changes independently', async () => {
    const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    mkdirSync(join(root, 'pages'))
    const firstPath = `${root}/pages/first.tsx`
    const secondPath = `${root}/pages/second.tsx`
    writeFileSync(firstPath, 'export default () => null')
    writeFileSync(secondPath, 'export default () => null')
    const changes = new Map<string, (routesChanged: boolean) => void>()

    try {
      const ctx = new PageContext({
        dirs: 'pages',
        resolver: {
          resolveModuleIds: () => ['~pages'],
          resolveExtensions: () => ['tsx'],
          resolveRoutes: () => '',
          getComputedRoutes: () => [],
          hmr: {
            changed: (_ctx, path) => new Promise<boolean>((resolve) => {
              changes.set(path, resolve)
            }),
          },
        },
      }, root)
      await ctx.searchGlob()

      const firstChange = ctx.handleFileChange('update', firstPath)
      const secondChange = ctx.handleFileChange('update', secondPath)
      changes.get(firstPath)!(true)
      changes.get(secondPath)!(false)

      await expect(firstChange).resolves.toBe(true)
      await expect(secondChange).resolves.toBe(false)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reloads routes when a route block is removed', async () => {
    const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    mkdirSync(join(root, 'pages'))
    const path = `${root}/pages/index.vue`
    writeFileSync(path, '<template><div /></template><route>{"meta":{"title":"Home"}}</route>')

    try {
      const ctx = new PageContext({ dirs: 'pages' }, root)
      await ctx.searchGlob()

      expect(await ctx.options.resolver.getComputedRoutes(ctx)).toEqual([
        expect.objectContaining({ meta: { title: 'Home' } }),
      ])

      writeFileSync(path, '<template><div /></template>')
      expect(await ctx.handleFileChange('update', path)).toBe(true)
      expect(await ctx.options.resolver.getComputedRoutes(ctx)).toEqual([
        { name: 'index', path: '/', component: '/pages/index.vue', props: true },
      ])

      expect(await ctx.handleFileChange('update', path)).toBe(false)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
