import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { createLogger } from 'vite'
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

async function resolveProjectRoutes(files: Record<string, string>) {
  const root = slash(realpathSync.native(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'src/pages'), { recursive: true })
  for (const [file, content] of Object.entries(files))
    writeFileSync(join(root, 'src/pages', file), content)
  const logger = createLogger()
  const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
  const ctx = new PageContext({
    dirs: 'src/pages',
    extensions: ['vue', 'jsx'],
  }, root)
  ctx.setLogger(logger)
  await ctx.searchGlob()
  const routes = await ctx.options.resolver.getComputedRoutes(ctx) as any[]
  const named = Object.fromEntries(routes.map(route => [route.path, route.name]))
  return {
    named,
    client: await ctx.resolveRoutes(),
    errors: error.mock.calls.map(([message]) => message),
  }
}

describe('route comment position', () => {
  const comment = '/*\nroute\n\nname: override\n*/\nexport default {}\n'

  it.each([
    ['first line', comment],
    ['no whitespace before route', '/*route\nname: override\n*/\nexport default {}\n'],
    ['leading blank line', `\n${comment}`],
    ['leading CRLF blank line', `\r\n${comment.replace(/\n/g, '\r\n')}`],
    ['leading spaces and blank lines', `  \n\t\n${comment}`],
  ])('applies route data from a comment at the %s', async (_, content) => {
    const { named, errors } = await resolveProjectRoutes({ 'page.jsx': content })
    expect(named).toEqual({ '/page': 'override' })
    expect(errors).toEqual([])
  })

  it('ignores a route comment after a line comment', async () => {
    const { named } = await resolveProjectRoutes({ 'page.jsx': `// @ts-nocheck\n${comment}` })
    expect(named).toEqual({ '/page': 'page' })
  })
})

describe('json5 route block numbers', () => {
  it.each(['Infinity', '-Infinity', 'NaN'])('reports %s and drops the route data', async (value) => {
    const { client, errors } = await resolveProjectRoutes({
      'bad.vue': `<template><div /></template>\n<route>{ meta: { value: ${value} } }</route>`,
      'good.vue': '<template><div /></template>\n<route>{ meta: { value: 1.5 } }</route>',
    })
    expect(errors).toEqual([
      expect.stringContaining('Route data numbers must be finite'),
    ])
    expect(errors[0]).toContain('Invalid JSON5 format of <route> content in')
    expect(client).toContain('"meta":{"value":1.5}')
    expect(client).not.toContain('null')
  })
})

describe('json route block numbers', () => {
  it.each([
    { lang: 'json', format: 'JSON' },
    { lang: 'json5', format: 'JSON5' },
  ])('reports a number that is too large in $lang', async ({ lang, format }) => {
    const { client, errors } = await resolveProjectRoutes({
      'bad.vue': `<template><div /></template>\n<route lang="${lang}">{ "meta": { "value": 1e400 } }</route>`,
    })
    expect(errors).toEqual([
      expect.stringContaining('Route data numbers must be finite'),
    ])
    expect(errors[0]).toContain(`Invalid ${format} format of <route> content in`)
    expect(client).not.toContain('null')
  })
})
