import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { PageContext } from '../src'

const routeBlock = '<route>\n{ meta: { title: "About" } }\n</route>\n'

function addSitePrefix(route: any) {
  if (route.meta?.title)
    route.meta.title = `Site | ${route.meta.title}`
}

async function createContext() {
  const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'src/pages'), { recursive: true })
  const page = `${root}/src/pages/about.vue`
  writeFileSync(page, `<template><div>v1</div></template>\n${routeBlock}`)
  const ctx = new PageContext({ dirs: 'src/pages', extendRoute: addSitePrefix }, root)
  await ctx.searchGlob()
  return { ctx, page }
}

describe('route block data', () => {
  it('gives the same routes each time they are generated', async () => {
    const { ctx } = await createContext()

    const first = await ctx.resolveRoutes()
    const second = await ctx.resolveRoutes()

    expect(first).toContain('"title":"Site | About"')
    expect(second).toBe(first)
  })

  it('reports no route change for a template-only edit', async () => {
    const { ctx, page } = await createContext()
    await ctx.resolveRoutes()

    writeFileSync(page, `<template><div>v2</div></template>\n${routeBlock}`)

    expect(await ctx.handleFileChange('update', page)).toBe(false)
  })
})
