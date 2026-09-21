import type { HotUpdateOptions, Plugin } from 'vite'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { createServer } from 'vite'
import pagesPlugin from '../src'

function getHotUpdate(plugin: Plugin) {
  if (typeof plugin.hotUpdate !== 'function')
    throw new TypeError('Expected a hotUpdate hook')

  return plugin.hotUpdate
}

describe('pages plugin', () => {
  it('reloads each environment when a page is created', async () => {
    const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    mkdirSync(join(root, 'pages'))
    const added = vi.fn()
    const plugin = pagesPlugin({
      dirs: 'pages',
      resolver: {
        resolveModuleIds: () => ['~pages'],
        resolveExtensions: () => ['tsx'],
        resolveRoutes: () => '',
        getComputedRoutes: () => [],
        hmr: { added },
      },
    })
    const server = await createServer({
      root,
      configFile: false,
      plugins: [plugin],
      server: { watch: null, ws: false },
    })

    try {
      const path = `${server.config.root}/pages/home.tsx`
      writeFileSync(path, 'export default () => null')
      const hotUpdate = getHotUpdate(plugin)
      const timestamp = Date.now()

      for (const environment of Object.values(server.environments)) {
        const send = vi.spyOn(environment.hot, 'send')
        const invalidateModule = vi.spyOn(environment.moduleGraph, 'invalidateModule').mockImplementation(() => {})
        const module = { id: 'virtual:vite-plugin-pages/generated-pages' }
        vi.spyOn(environment.moduleGraph, 'getModulesByFile').mockReturnValue(new Set([module]) as never)

        const result = await hotUpdate.call({ environment } as never, {
          type: 'create',
          file: path,
          timestamp,
          modules: [],
          read: () => '',
          server,
        } satisfies HotUpdateOptions)

        expect(result).toEqual([])
        expect(invalidateModule).toHaveBeenCalledExactlyOnceWith(module, expect.any(Set), timestamp, true)
        expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'full-reload' })
      }

      expect(added).toHaveBeenCalledExactlyOnceWith(expect.anything(), path)
    }
    finally {
      await server.close()
      rmSync(root, { recursive: true, force: true })
    }
  })
})
