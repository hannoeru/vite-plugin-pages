import type { UserOptions } from '../src/types'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { slash } from '@antfu/utils'
import { matchRoutes } from 'react-router'
import { PageContext } from '../src'

const pages = {
  next: ['About.tsx', 'Blog/[postId].tsx', 'Docs/[...Slug].tsx'],
  nuxt: ['About.tsx', 'Blog/_postId.tsx', 'Docs/_.tsx'],
  remix: [
    'About.tsx',
    'Blog.$postId.tsx',
    'Docs.$.tsx',
    '[Feed.XML].tsx',
  ],
} as const

async function getRoutes(files: readonly string[], options: UserOptions) {
  const root = slash(realpathSync.native(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  for (const file of files) {
    mkdirSync(dirname(join(root, 'src/pages', file)), { recursive: true })
    writeFileSync(join(root, 'src/pages', file), 'export default () => null')
  }
  const ctx = new PageContext({ dirs: 'src/pages', ...options }, root)
  await ctx.searchGlob()
  return await ctx.options.resolver.getComputedRoutes(ctx) as any[]
}

function paths(routes: any[]) {
  return routes.map(route => route.path).sort()
}

describe.each(['react', 'solid'] as const)('%s route path case', (resolver) => {
  it.each([
    [
      'next',
      ['about', 'blog/:postId', 'docs/*'],
    ],
    [
      'nuxt',
      ['about', 'blog/:postId', 'docs/*'],
    ],
    [
      'remix',
      [
        'about',
        'blog/:postId',
        'docs/*',
        'feed.xml',
      ],
    ],
  ] as const)('lowercases static %s segments and keeps parameter names', async (routeStyle, expected) => {
    expect(paths(await getRoutes(pages[routeStyle], { resolver, routeStyle }))).toEqual(expected)
  })

  it.each([
    [
      'next',
      ['About', 'Blog/:postId', 'Docs/*'],
    ],
    [
      'nuxt',
      ['About', 'Blog/:postId', 'Docs/*'],
    ],
    [
      'remix',
      [
        'About',
        'Blog/:postId',
        'Docs/*',
        'Feed.XML',
      ],
    ],
  ] as const)('keeps %s segments as written when case-sensitive', async (routeStyle, expected) => {
    expect(paths(await getRoutes(pages[routeStyle], { resolver, routeStyle, caseSensitive: true }))).toEqual(expected)
  })
})

describe('react-router path case', () => {
  it('matches lowercase and original URLs and keeps the parameter name', async () => {
    const routes = await getRoutes(pages.next, { resolver: 'react' })

    expect(matchRoutes(routes, '/about')?.at(-1)?.route.element).toBe('/src/pages/About.tsx')
    expect(matchRoutes(routes, '/About')?.at(-1)?.route.element).toBe('/src/pages/About.tsx')
    expect(matchRoutes(routes, '/blog/Hello')?.at(-1)?.params).toEqual({ postId: 'Hello' })
  })

  it('matches only the original case when case-sensitive', async () => {
    const routes = await getRoutes(pages.next, { resolver: 'react', caseSensitive: true })

    expect(matchRoutes(routes, '/About')?.at(-1)?.route.element).toBe('/src/pages/About.tsx')
    expect(matchRoutes(routes, '/about')).toBeNull()
  })
})
