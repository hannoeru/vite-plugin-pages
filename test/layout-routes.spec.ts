import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { slash } from '@antfu/utils'
import { matchRoutes } from 'react-router'
import { createMemoryHistory, createRouter } from 'vue-router'
// eslint-disable-next-line antfu/no-import-dist, antfu/no-import-node-modules-by-path -- @solidjs/router does not export its route matcher
import { createBranches, getRouteMatches } from '../node_modules/@solidjs/router/dist/routing.js'
import { PageContext } from '../src'

function vuePage(file: string) {
  return `<template><div /></template>\n<route>\n{ meta: { title: "${file}" } }\n</route>\n`
}

async function getRoutes(files: string[], resolver: 'vue' | 'react' | 'solid', routeStyle?: 'remix') {
  const root = slash(realpathSync.native(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  for (const file of files) {
    mkdirSync(dirname(join(root, 'src/pages', file)), { recursive: true })
    writeFileSync(join(root, 'src/pages', file), file.endsWith('.vue')
      ? vuePage(file)
      : 'export default () => null')
  }
  const ctx = new PageContext({ dirs: 'src/pages', resolver, routeStyle }, root)
  await ctx.searchGlob()
  return await ctx.options.resolver.getComputedRoutes(ctx) as any[]
}

function reactPages(routes: any[], path: string) {
  return matchRoutes(routes, path)?.map(match => match.route.element)
}

function solidPages(routes: any[], path: string) {
  return getRouteMatches(createBranches(routes), path)?.map(match => match.route.key.component)
}

function vueRouter(routes: any[]) {
  const toRecords = (records: any[]): any[] => records.map(record => ({
    ...record,
    component: { name: record.component },
    children: record.children && toRecords(record.children),
  }))
  return createRouter({
    history: createMemoryHistory(),
    routes: toRecords(routes),
  })
}

function vuePages(routes: any[], path: string) {
  return vueRouter(routes).resolve(path).matched.map(record => (record.components!.default as any).name)
}

describe('layout page without an index page', () => {
  it('renders the layout alone at its path when it has no catch-all page', async () => {
    const files = ['users', 'users/profile']
    const react = await getRoutes(files.map(file => `${file}.tsx`), 'react')
    const solid = await getRoutes(files.map(file => `${file}.tsx`), 'solid')
    const vue = await getRoutes(files.map(file => `${file}.vue`), 'vue')

    expect(reactPages(react, '/users')).toEqual(['/src/pages/users.tsx'])
    expect(solidPages(solid, '/users')).toEqual(['/src/pages/users.tsx', undefined])
    expect(vuePages(vue, '/users')).toEqual(['/src/pages/users.vue'])

    expect(reactPages(react, '/users/profile')).toEqual(['/src/pages/users.tsx', '/src/pages/users/profile.tsx'])
    expect(solidPages(solid, '/users/profile')).toEqual(['/src/pages/users.tsx', '/src/pages/users/profile.tsx'])
    expect(vuePages(vue, '/users/profile')).toEqual(['/src/pages/users.vue', '/src/pages/users/profile.vue'])
  })

  it('renders a dynamic layout alone at its path', async () => {
    const solid = await getRoutes(['[sensor].tsx', '[sensor]/current.tsx'], 'solid')

    expect(solidPages(solid, '/a')).toEqual(['/src/pages/[sensor].tsx', undefined])
    expect(solidPages(solid, '/a/current')).toEqual(['/src/pages/[sensor].tsx', '/src/pages/[sensor]/current.tsx'])
  })

  it('renders the catch-all page in the layout at the layout path', async () => {
    const files = ['docs', 'docs/[...all]', 'docs/guide']
    const react = await getRoutes(files.map(file => `${file}.tsx`), 'react')
    const solid = await getRoutes(files.map(file => `${file}.tsx`), 'solid')
    const vue = await getRoutes(files.map(file => `${file}.vue`), 'vue')

    for (const path of ['/docs', '/docs/a/b']) {
      expect(reactPages(react, path)).toEqual(['/src/pages/docs.tsx', '/src/pages/docs/[...all].tsx'])
      expect(solidPages(solid, path)).toEqual(['/src/pages/docs.tsx', '/src/pages/docs/[...all].tsx'])
      expect(vuePages(vue, path)).toEqual(['/src/pages/docs.vue', '/src/pages/docs/[...all].vue'])
    }

    expect(reactPages(react, '/docs/guide')).toEqual(['/src/pages/docs.tsx', '/src/pages/docs/guide.tsx'])
    expect(solidPages(solid, '/docs/guide')).toEqual(['/src/pages/docs.tsx', '/src/pages/docs/guide.tsx'])
    expect(vuePages(vue, '/docs/guide')).toEqual(['/src/pages/docs.vue', '/src/pages/docs/guide.vue'])
  })

  it('keeps the name and meta of the vue catch-all page at the layout path', async () => {
    const warn = vi.spyOn(console, 'warn')
    onTestFinished(() => warn.mockRestore())
    const router = vueRouter(await getRoutes(['docs.vue', 'docs/[...all].vue'], 'vue'))

    const route = router.resolve('/docs')
    expect(route.name).toBe('docs-all')
    expect(route.meta).toEqual({ title: 'docs/[...all].vue' })
    expect(router.resolve({
      name: 'docs-all',
      params: {
        all: ['a'],
      },
    }).fullPath).toBe('/docs/a')
    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps the index page at the layout path', async () => {
    const files = ['docs', 'docs/index', 'docs/[...all]']
    const react = await getRoutes(files.map(file => `${file}.tsx`), 'react')
    const solid = await getRoutes(files.map(file => `${file}.tsx`), 'solid')
    const vue = await getRoutes(files.map(file => `${file}.vue`), 'vue')

    expect(reactPages(react, '/docs')).toEqual(['/src/pages/docs.tsx', '/src/pages/docs/index.tsx'])
    expect(solidPages(solid, '/docs')).toEqual(['/src/pages/docs.tsx', '/src/pages/docs/index.tsx'])
    expect(vuePages(vue, '/docs')).toEqual(['/src/pages/docs.vue', '/src/pages/docs/index.vue'])
  })

  it.each([
    ['a child page', '__marketing/product.tsx', '/product'],
    ['a catch-all page', '__marketing/$.tsx', '/x'],
  ])('keeps the root index page beside a remix pathless layout with %s', async (_, child, childPath) => {
    const files = ['__marketing.tsx', child, 'index.tsx']
    const react = await getRoutes(files, 'react', 'remix')
    const solid = await getRoutes(files, 'solid', 'remix')

    expect(reactPages(react, '/')).toEqual(['/src/pages/index.tsx'])
    expect(solidPages(solid, '/')).toEqual(['/src/pages/index.tsx'])
    expect(reactPages(react, childPath)).toEqual(['/src/pages/__marketing.tsx', `/src/pages/${child}`])
    expect(solidPages(solid, childPath)).toEqual(['/src/pages/__marketing.tsx', `/src/pages/${child}`])
  })
})
