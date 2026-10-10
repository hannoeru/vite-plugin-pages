import type { DevEnvironment, HotUpdateOptions, Plugin } from 'vite'
import type { PageResolver } from '../src/types'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { createServer } from 'vite'
import pagesPlugin, { PageContext } from '../src'

function getHotUpdate(plugin: Plugin) {
  if (typeof plugin.hotUpdate !== 'function')
    throw new TypeError('Expected a hotUpdate hook')

  return plugin.hotUpdate
}

async function createHotUpdateFixture(hmr: PageResolver['hmr'] = {}, plugins: Plugin[] = []) {
  const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
  mkdirSync(join(root, 'pages'))
  const plugin = pagesPlugin({
    dirs: 'pages',
    resolver: {
      resolveModuleIds: () => ['~pages'],
      resolveExtensions: () => ['tsx'],
      resolveRoutes: ctx => `export default ${JSON.stringify([...ctx.pageRouteMap.values()])}`,
      getComputedRoutes: () => [],
      hmr,
    },
  })
  const server = await createServer({
    root,
    configFile: false,
    plugins: [plugin, ...plugins],
    server: { watch: null, ws: false },
  })
  onTestFinished(async () => {
    await server.close()
    rmSync(root, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  const environments = Object.values(server.environments)
  for (const environment of environments)
    await environment.transformRequest('~pages')

  const invalidations = environments.map(environment => vi.spyOn(environment.moduleGraph, 'invalidateModule'))
  const sends = environments.map(environment => vi.spyOn(environment.hot, 'send'))
  const hotUpdate = getHotUpdate(plugin)
  const invoke = (environment: DevEnvironment, file: string, type: HotUpdateOptions['type'], timestamp = 123) => hotUpdate.call({ environment } as never, {
    type,
    file,
    timestamp,
    modules: [],
    read: () => '',
    server,
  } satisfies HotUpdateOptions)

  return { server, environments, invalidations, sends, invoke }
}

describe('pages plugin', () => {
  it('preserves distinct files with the same timestamp in each environment', async () => {
    const added = vi.fn()
    const { server, environments, invalidations, sends, invoke } = await createHotUpdateFixture({ added })
    const files = ['a', 'b'].map(name => `${server.config.root}/pages/${name}.tsx`)
    for (const file of files)
      writeFileSync(file, 'export default () => null')

    for (const environment of environments) {
      for (const file of files)
        expect(await invoke(environment, file, 'create')).toEqual([])
    }

    expect(added.mock.calls.map(([, file]) => file)).toEqual(files)
    for (const invalidate of invalidations)
      expect(invalidate).toHaveBeenCalledTimes(2)
    for (const send of sends)
      expect(send).toHaveBeenCalledTimes(2)
    for (const environment of environments) {
      const result = await environment.transformRequest('~pages')
      expect(result?.code).toContain('"route":"a"')
      expect(result?.code).toContain('"route":"b"')
    }
  })

  it('preserves distinct event types for one file with the same timestamp', async () => {
    const added = vi.fn()
    const changed = vi.fn(() => true)
    const removed = vi.fn()
    const { server, environments, invalidations, sends, invoke } = await createHotUpdateFixture({ added, changed, removed })
    const file = `${server.config.root}/pages/home.tsx`
    writeFileSync(file, 'export default () => null')

    for (const environment of environments) {
      for (const type of ['create', 'update', 'delete'] as const)
        expect(await invoke(environment, file, type)).toEqual([])
    }

    for (const callback of [added, changed, removed])
      expect(callback).toHaveBeenCalledExactlyOnceWith(expect.anything(), file)
    for (const invalidate of invalidations)
      expect(invalidate).toHaveBeenCalledTimes(3)
    for (const send of sends)
      expect(send).toHaveBeenCalledTimes(3)
  })

  it('keeps concurrent events independent when they finish out of order', async () => {
    const first = Promise.withResolvers<void>()
    const second = Promise.withResolvers<void>()
    const added = vi.fn((_ctx: PageContext, file: string) => file.endsWith('/a.tsx') ? first.promise : second.promise)
    const { server, environments, invalidations, invoke } = await createHotUpdateFixture({ added })
    const files = ['a', 'b'].map(name => `${server.config.root}/pages/${name}.tsx`)
    for (const file of files)
      writeFileSync(file, 'export default () => null')

    const firstUpdates = environments.map(environment => invoke(environment, files[0], 'create'))
    const secondUpdates = environments.map(environment => invoke(environment, files[1], 'create'))
    expect(added.mock.calls.map(([, file]) => file)).toEqual(files)
    second.resolve()
    expect(await Promise.all(secondUpdates)).toEqual(environments.map(() => []))
    for (const invalidate of invalidations)
      expect(invalidate).toHaveBeenCalledTimes(1)
    first.resolve()
    expect(await Promise.all(firstUpdates)).toEqual(environments.map(() => []))
    for (const invalidate of invalidations)
      expect(invalidate).toHaveBeenCalledTimes(2)
  })

  it('refreshes real client and SSR modules after a burst of file events', async () => {
    const finished = Promise.withResolvers<void>()
    let events = 0
    const added = vi.fn()
    const { server, environments } = await createHotUpdateFixture({ added }, [{
      name: 'observe-page-events',
      hotUpdate() {
        if (++events === 60)
          finished.resolve()
      },
    }])
    const files = Array.from({ length: 30 }, (_, index) => `${server.config.root}/pages/page${index}.tsx`)
    for (const file of files) {
      writeFileSync(file, 'export default () => null')
      server.watcher.emit('add', file)
    }
    await finished.promise

    expect(added).toHaveBeenCalledTimes(30)
    for (const environment of environments) {
      const result = await environment.transformRequest('~pages')
      for (let index = 0; index < 30; index++)
        expect(result?.code).toContain(`"route":"page${index}"`)
    }
  })

  it.each([false, true, 'reject'])('releases completed event records after %s', async (outcome) => {
    const { server, environments, invoke } = await createHotUpdateFixture()
    const handleFileChange = vi.spyOn(PageContext.prototype, 'handleFileChange')
    if (outcome === 'reject')
      handleFileChange.mockRejectedValueOnce(new Error('resolver failed'))
    else
      handleFileChange.mockResolvedValueOnce(outcome)
    handleFileChange.mockResolvedValue(true)
    const file = `${server.config.root}/pages/home.tsx`

    for (const environment of environments) {
      const update = invoke(environment, file, 'update')
      if (outcome === 'reject')
        await expect(update).rejects.toThrow('resolver failed')
      else
        expect(await update).toEqual(outcome ? [] : undefined)
    }
    expect(handleFileChange).toHaveBeenCalledTimes(1)

    for (const environment of environments)
      expect(await invoke(environment, file, 'update')).toEqual([])
    expect(handleFileChange).toHaveBeenCalledTimes(2)
  })

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
        const module = { id: '\0virtual:vite-plugin-pages/generated-pages' }
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
