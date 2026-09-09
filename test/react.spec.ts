import type { UserOptions } from '../src/types'
import { resolve } from 'node:path'
import { slash } from '@antfu/utils'
import { PageContext } from '../src/context'

async function getRoutes(filename: string, options: UserOptions = {}) {
  const ctx = new PageContext({
    dirs: 'examples/react/src/pages',
    resolver: 'react',
    ...options,
  })
  await ctx.addPage(slash(resolve('examples/react/src/pages', `${filename}.tsx`)), ctx.options.dirs[0])
  return ctx.options.resolver.getComputedRoutes(ctx)
}

describe.each(['next', 'nuxt', 'remix'] as const)('react %s index routes', (routeStyle) => {
  it.each([
    ['index', '/'],
    ['INDEX', '/'],
    ['reindex', 'reindex'],
    ['myindex', 'myindex'],
  ])('maps %s.tsx to %s', async (filename, path) => {
    expect(await getRoutes(filename, { routeStyle })).toEqual([
      expect.objectContaining({ path }),
    ])
  })

  it('respects case-sensitive index names', async () => {
    expect(await getRoutes('INDEX', { routeStyle, caseSensitive: true })).toEqual([
      expect.objectContaining({ path: 'INDEX' }),
    ])
  })
})

describe('react remix flat routes', () => {
  it.each([
    ['blog.index', 'blog'],
    ['blog.reindex', 'blog/reindex'],
    ['[index]', 'index'],
  ])('maps %s.tsx to %s', async (filename, path) => {
    expect(await getRoutes(filename, { routeStyle: 'remix' })).toEqual([
      expect.objectContaining({ path }),
    ])
  })
})
