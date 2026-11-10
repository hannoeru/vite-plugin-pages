import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { slash } from '@antfu/utils'
import { matchRoutes } from 'react-router'
import { PageContext } from '../src'

async function getRoutes(files: string[], resolver: 'react' | 'solid' = 'react') {
  const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  for (const file of files) {
    mkdirSync(dirname(join(root, 'src/pages', file)), { recursive: true })
    writeFileSync(join(root, 'src/pages', file), 'export default () => null')
  }
  const ctx = new PageContext({ dirs: 'src/pages', resolver }, root)
  await ctx.searchGlob()
  return await ctx.options.resolver.getComputedRoutes(ctx) as any[]
}

function renderedPage(routes: any[], path: string) {
  return matchRoutes(routes, path)?.at(-1)?.route.element
}

describe('react directory routes', () => {
  it('renders a page for a directory without its own page', async () => {
    const routes = await getRoutes([
      '[...all].tsx',
      'docs/[...all].tsx',
      'users/[id].tsx',
      'blog/today/index.tsx',
    ])

    expect(renderedPage(routes, '/docs')).toBe('/src/pages/docs/[...all].tsx')
    expect(renderedPage(routes, '/docs/intro')).toBe('/src/pages/docs/[...all].tsx')
    expect(renderedPage(routes, '/users')).toBe('/src/pages/[...all].tsx')
    expect(renderedPage(routes, '/users/abc')).toBe('/src/pages/users/[id].tsx')
    expect(renderedPage(routes, '/blog')).toBe('/src/pages/[...all].tsx')
    expect(renderedPage(routes, '/blog/today')).toBe('/src/pages/blog/today/index.tsx')
  })

  it('keeps a layout page as the parent of its directory', async () => {
    const routes = await getRoutes(['about.tsx', 'about/index.tsx', 'about/[id].tsx'])

    expect(matchRoutes(routes, '/about')?.map(match => match.route.element)).toEqual(['/src/pages/about.tsx', '/src/pages/about/index.tsx'])
    expect(matchRoutes(routes, '/about/1')?.map(match => match.route.element)).toEqual(['/src/pages/about.tsx', '/src/pages/about/[id].tsx'])
  })
})

describe('solid directory routes', () => {
  it('uses the same route records as react for a directory without its own page', async () => {
    const routes = await getRoutes(['docs/[...all].tsx', 'docs/index.tsx', 'users/[id].tsx'], 'solid')

    expect(routes.map(route => [route.path, route.component, route.children]).sort()).toEqual([
      ['docs', '/src/pages/docs/index.tsx', undefined],
      ['docs/*', '/src/pages/docs/[...all].tsx', undefined],
      ['users/:id', '/src/pages/users/[id].tsx', undefined],
    ])
  })
})
