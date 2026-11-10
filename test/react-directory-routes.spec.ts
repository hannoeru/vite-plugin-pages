import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { slash } from '@antfu/utils'
import { matchRoutes } from 'react-router'
import { PageContext } from '../src'

async function getRoutes(files: string[]) {
  const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  for (const file of files) {
    mkdirSync(dirname(join(root, 'src/pages', file)), { recursive: true })
    writeFileSync(join(root, 'src/pages', file), 'export default () => null')
  }
  const ctx = new PageContext({ dirs: 'src/pages', resolver: 'react' }, root)
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
