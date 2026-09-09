import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { createServer } from 'vite'
import { PageContext } from '../src/context'

describe('page context', () => {
  it('reloads routes when a route block is removed', async () => {
    const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    mkdirSync(join(root, 'pages'))
    const path = `${root}/pages/index.vue`
    writeFileSync(path, '<template><div /></template><route>{"meta":{"title":"Home"}}</route>')
    const server = await createServer({ root, configFile: false, server: { watch: null, ws: false } })

    try {
      const ctx = new PageContext({ dirs: 'pages' }, root)
      await ctx.searchGlob()
      ctx.setupViteServer(server)
      const send = vi.spyOn(server.ws, 'send')

      expect(await ctx.options.resolver.getComputedRoutes(ctx)).toEqual([
        expect.objectContaining({ meta: { title: 'Home' } }),
      ])

      writeFileSync(path, '<template><div /></template>')
      await Promise.all(server.watcher.listeners('change').map(listener => listener(path)))

      expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'full-reload' })
      expect(await ctx.options.resolver.getComputedRoutes(ctx)).toEqual([
        { name: 'index', path: '/', component: '/pages/index.vue', props: true },
      ])

      send.mockClear()
      await Promise.all(server.watcher.listeners('change').map(listener => listener(path)))
      expect(send).not.toHaveBeenCalled()
    }
    finally {
      await server.close()
      rmSync(root, { recursive: true, force: true })
    }
  })
})
