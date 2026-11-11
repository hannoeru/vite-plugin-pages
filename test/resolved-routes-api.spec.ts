import type { Plugin } from 'vite'
import type { UserOptions } from '../src'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { resolveConfig } from 'vite'
import pagesPlugin from '../src'

const pageFiles = {
  vue: ['index.vue', 'about.vue', 'contact.vue'],
  react: ['index.tsx', 'about.tsx', 'contact.tsx'],
  solid: ['index.tsx', 'about.tsx', 'contact.tsx'],
}

function routePaths(routes: { path?: string }[]) {
  return routes.map(route => route.path).sort()
}

describe('getResolvedRoutes', () => {
  it.each([
    { resolver: 'vue', order: 'before' },
    { resolver: 'vue', order: 'after' },
    { resolver: 'react', order: 'before' },
    { resolver: 'react', order: 'after' },
    { resolver: 'solid', order: 'before' },
    { resolver: 'solid', order: 'after' },
  ] as const)('returns all $resolver routes to a plugin placed $order the pages plugin', async ({ resolver, order }) => {
    const root = slash(realpathSync.native(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))))
    onTestFinished(() => rmSync(root, { recursive: true, force: true }))
    mkdirSync(join(root, 'src/pages'), { recursive: true })
    for (const page of pageFiles[resolver])
      writeFileSync(join(root, 'src/pages', page), 'export default {}')

    let routesInConfigResolved: { path?: string }[] = []
    const reader: Plugin = {
      name: 'routes-reader',
      async configResolved(config) {
        const plugin = config.plugins.find(p => p.name === 'vite-plugin-pages')!
        routesInConfigResolved = await plugin.api.getResolvedRoutes()
      },
    }
    const pages = pagesPlugin({ resolver } satisfies UserOptions)
    const config = await resolveConfig({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: order === 'before'
        ? [reader, pages]
        : [pages, reader],
    }, 'serve')

    const plugin = config.plugins.find(p => p.name === 'vite-plugin-pages')!
    const finalRoutes = await plugin.api.getResolvedRoutes()
    expect(finalRoutes).toHaveLength(3)
    expect(routePaths(routesInConfigResolved)).toEqual(routePaths(finalRoutes))
  })
})
