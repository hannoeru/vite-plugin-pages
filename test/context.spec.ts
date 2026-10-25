import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { PageContext } from '../src/context'

describe('page context', () => {
  it.each([
    {
      name: 'the documented component file exclusion',
      dirs: ['src/pages'],
      exclude: ['**/components/*.vue'],
      allowed: ['src/pages/home.vue', 'src/pages/components/nested/home.vue'],
      excluded: ['src/pages/components/form.vue'],
    },
    {
      name: 'an exact page-relative file exclusion',
      dirs: ['src/pages'],
      exclude: ['private.vue'],
      allowed: ['src/pages/home.vue'],
      excluded: ['src/pages/private.vue'],
    },
    {
      name: 'default directory excludes in the default page directory',
      dirs: undefined,
      exclude: undefined,
      allowed: ['src/pages/home.vue'],
      excluded: [
        'src/pages/node_modules/pkg.vue',
        'src/pages/.git/hooks/pkg.vue',
        'src/pages/nested/node_modules/pkg.vue',
        'src/pages/nested/.git/hooks/pkg.vue',
      ],
    },
    {
      name: 'default nested Git excludes with an explicit hidden pattern',
      dirs: [{ dir: 'src/pages', filePattern: '.git/**/*.vue' }],
      exclude: undefined,
      allowed: [],
      excluded: ['src/pages/.git/hooks/pkg.vue'],
    },
    {
      name: 'default directory excludes at the project root',
      dirs: ['.'],
      exclude: undefined,
      allowed: ['home.vue'],
      excluded: ['node_modules/lib/index.vue', '.git/hooks/index.vue', '__tests__/index.vue'],
    },
    {
      name: 'default excludes with explicit hidden patterns',
      dirs: [{ dir: '.', filePattern: '.*/**/*.vue' }],
      exclude: undefined,
      allowed: ['.allowed/home.vue'],
      excluded: ['.git/hooks/index.vue'],
    },
    {
      name: 'literal directory excludes below a page directory',
      dirs: ['pages'],
      exclude: ['excluded'],
      allowed: ['pages/home.vue'],
      excluded: ['pages/excluded/nested/home.vue'],
    },
    {
      name: 'wildcard directory excludes and their descendants',
      dirs: ['pages'],
      exclude: ['excl*'],
      allowed: ['pages/home.vue'],
      excluded: ['pages/excluded/nested/home.vue'],
    },
    {
      name: 'page directories below an ancestor with an excluded name',
      dirs: ['pages/excluded/nested'],
      exclude: ['**/excluded/**'],
      allowed: ['pages/excluded/nested/home.vue'],
      excluded: ['pages/excluded/nested/excluded/home.vue'],
    },
    {
      name: 'page-relative excludes across multiple page directories',
      dirs: ['pages', 'other'],
      exclude: ['excluded/**'],
      allowed: ['pages/home.vue', 'other/home.vue'],
      excluded: ['pages/excluded/home.vue', 'other/excluded/home.vue'],
    },
    {
      name: 'globstar excludes across multiple page directories',
      dirs: ['pages', 'other'],
      exclude: ['**/excluded/**'],
      allowed: ['pages/home.vue', 'other/home.vue'],
      excluded: ['pages/excluded/home.vue', 'other/excluded/home.vue'],
    },
    {
      name: 'page-relative excludes in a hidden page directory',
      dirs: ['.pages'],
      exclude: ['excluded/**'],
      allowed: ['.pages/home.vue'],
      excluded: ['.pages/excluded/home.vue'],
    },
    {
      name: 'explicit hidden file patterns',
      dirs: [{ dir: 'pages', filePattern: '**/.*.vue' }],
      exclude: ['excluded/**'],
      allowed: ['pages/.home.vue', 'pages/nested/.home.vue'],
      excluded: ['pages/excluded/.home.vue'],
    },
    {
      name: 'explicit hidden directory patterns',
      dirs: [{ dir: 'pages', filePattern: '.nested/**/*.vue' }],
      exclude: ['**/excluded/**'],
      allowed: ['pages/.nested/home.vue'],
      excluded: ['pages/.nested/excluded/home.vue'],
    },
    {
      name: 'concrete page directories with glob characters',
      dirs: ['features/*/pages'],
      exclude: ['excluded/**'],
      allowed: ['features/[feature]/pages/home.vue'],
      excluded: ['features/[feature]/pages/excluded/home.vue'],
    },
    {
      name: 'literal glob characters in excluded directory names',
      dirs: ['pages'],
      exclude: [String.raw`\[draft\]/**`],
      allowed: ['pages/home.vue', 'pages/draft/home.vue'],
      excluded: ['pages/[draft]/home.vue'],
    },
    {
      name: 'page directories discovered below an excluded name',
      dirs: ['features/*/pages'],
      exclude: ['excluded/**'],
      allowed: ['features/excluded/pages/home.vue', 'features/other/pages/home.vue'],
      excluded: ['features/excluded/pages/excluded/home.vue', 'features/other/pages/excluded/home.vue'],
    },
    {
      name: 'a file pattern with a fixed directory prefix',
      dirs: [{ dir: 'pages', filePattern: 'nested/**/*.vue' }],
      exclude: ['nested/drafts/**'],
      allowed: ['pages/nested/home.vue'],
      excluded: ['pages/nested/drafts/home.vue'],
    },
    {
      name: 'a wildcard exclude above a fixed file-pattern prefix',
      dirs: [{ dir: 'pages', filePattern: 'nested/*.vue' }],
      exclude: ['nested*'],
      allowed: [],
      excluded: ['pages/nested/home.vue'],
    },
    {
      name: 'a root wildcard exclude above a fixed file-pattern prefix',
      dirs: [{ dir: 'pages', filePattern: 'nested/*.vue' }],
      exclude: ['*'],
      allowed: [],
      excluded: ['pages/nested/home.vue'],
    },
    {
      name: 'no project-relative exclude fallback',
      dirs: ['pages'],
      exclude: ['pages/excluded/**'],
      allowed: ['pages/home.vue', 'pages/excluded/home.vue'],
      excluded: [],
    },
  ])('keeps discovery and file changes consistent for $name', async ({ dirs, exclude, allowed, excluded }) => {
    const root = slash(mkdtempSync(join(tmpdir(), '.vite-plugin-pages-[project]-')))
    const component = (title: string) => `<template><div /></template><route>{"meta":{"title":"${title}"}}</route>`

    try {
      for (const file of [...allowed, ...excluded]) {
        mkdirSync(join(root, file, '..'), { recursive: true })
        writeFileSync(join(root, file), component('Initial'))
      }
      const ctx = new PageContext({ dirs, exclude }, root)
      await ctx.searchGlob()
      const expectedPaths = allowed.map(file => `${root}/${file}`).sort()
      expect([...ctx.pageRouteMap.keys()].sort()).toEqual(expectedPaths)

      for (const file of excluded) {
        const path = `${root}/${file}`
        writeFileSync(path, component('Updated'))
        expect(await ctx.handleFileChange('update', path)).toBe(false)
        rmSync(path)
        expect(await ctx.handleFileChange('delete', path)).toBe(false)
        writeFileSync(path, component('Created'))
        expect(await ctx.handleFileChange('create', path)).toBe(false)
        expect(ctx.pageRouteMap.has(path)).toBe(false)
      }

      for (const file of allowed) {
        const path = `${root}/${file}`
        writeFileSync(path, component('Updated'))
        expect(await ctx.handleFileChange('update', path)).toBe(true)
        expect(await ctx.options.resolver.getComputedRoutes(ctx)).toEqual(expect.arrayContaining([
          expect.objectContaining({ component: `/${file}`, meta: { title: 'Updated' } }),
        ]))
        rmSync(path)
        expect(await ctx.handleFileChange('delete', path)).toBe(true)
        expect(ctx.pageRouteMap.has(path)).toBe(false)
        writeFileSync(path, component('Created'))
        expect(await ctx.handleFileChange('create', path)).toBe(true)
        expect(ctx.pageRouteMap.has(path)).toBe(true)
      }

      const scanned = new PageContext({ dirs, exclude }, root)
      await scanned.searchGlob()
      expect(ctx.pageRouteMap).toEqual(scanned.pageRouteMap)
      expect([...ctx.pageRouteMap.keys()].sort()).toEqual(expectedPaths)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it.each([
    { absoluteDir: false, hidden: false },
    { absoluteDir: true, hidden: false },
    { absoluteDir: false, hidden: true },
    { absoluteDir: true, hidden: true },
  ])('uses page-relative excludes for external pages with $absoluteDir/$hidden', async ({ absoluteDir, hidden }) => {
    const fixture = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    const root = `${fixture}/project`
    const dir = hidden ? '.shared' : 'shared'
    const pages = `${fixture}/${dir}/pages`
    mkdirSync(root)
    mkdirSync(`${pages}/excluded`, { recursive: true })
    const home = `${pages}/home.vue`
    const excluded = `${pages}/excluded/home.vue`
    writeFileSync(home, '<template><div /></template>')
    writeFileSync(excluded, '<template><div /></template>')

    try {
      const ctx = new PageContext({
        dirs: absoluteDir ? pages : `../${dir}/pages`,
        exclude: ['excluded'],
      }, root)
      await ctx.searchGlob()
      expect([...ctx.pageRouteMap.keys()]).toEqual([home])
      expect(await ctx.handleFileChange('update', excluded)).toBe(false)
      rmSync(excluded)
      expect(await ctx.handleFileChange('delete', excluded)).toBe(false)
      writeFileSync(excluded, '<template><div /></template>')
      expect(await ctx.handleFileChange('create', excluded)).toBe(false)

      writeFileSync(home, '<template><div /></template><route>{"meta":{"title":"Updated"}}</route>')
      expect(await ctx.handleFileChange('update', home)).toBe(true)
      expect(await ctx.options.resolver.getComputedRoutes(ctx)).toEqual([
        expect.objectContaining({ meta: { title: 'Updated' } }),
      ])
      rmSync(home)
      expect(await ctx.handleFileChange('delete', home)).toBe(true)
      writeFileSync(home, '<template><div /></template>')
      expect(await ctx.handleFileChange('create', home)).toBe(true)
      expect([...ctx.pageRouteMap.keys()]).toEqual([home])
      const scanned = new PageContext(ctx.rawOptions, root)
      await scanned.searchGlob()
      expect(scanned.pageRouteMap).toEqual(ctx.pageRouteMap)
    }
    finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it.each([false, true])('keeps nested directory ownership consistent with reverse order %s', async (reverse) => {
    const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    const dirs = [
      { dir: 'pages', baseRoute: 'outer' },
      { dir: 'pages/nested', baseRoute: 'inner' },
    ]
    if (reverse)
      dirs.reverse()
    const path = `${root}/pages/nested/home.vue`
    const draft = `${root}/pages/nested/drafts/home.vue`
    try {
      mkdirSync(`${root}/pages/nested/drafts`, { recursive: true })
      writeFileSync(path, '<template><div /></template>')
      writeFileSync(draft, '<template><div /></template>')
      const ctx = new PageContext({ dirs, exclude: ['nested/drafts/**'] }, root)
      await ctx.searchGlob()
      expect(ctx.pageRouteMap.get(path)?.route).toBe(reverse ? 'outer/nested/home' : 'inner/home')
      expect(ctx.pageRouteMap.get(draft)?.route).toBe('inner/drafts/home')
      const initial = new Map(ctx.pageRouteMap)
      for (const file of [path, draft]) {
        writeFileSync(file, '<template><div /></template><route>{"meta":{"title":"Updated"}}</route>')
        expect(await ctx.handleFileChange('update', file)).toBe(true)
        rmSync(file)
        expect(await ctx.handleFileChange('delete', file)).toBe(true)
        writeFileSync(file, '<template><div /></template>')
        expect(await ctx.handleFileChange('create', file)).toBe(true)
      }
      expect(ctx.pageRouteMap).toEqual(initial)
      const scanned = new PageContext(ctx.rawOptions, root)
      await scanned.searchGlob()
      expect(ctx.pageRouteMap).toEqual(scanned.pageRouteMap)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

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
