import type { DevEnvironment, HotUpdateOptions, Plugin, ServerOptions } from 'vite'
import type { PageResolver } from '../src/types'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
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

async function createHotUpdateFixture(hmr: PageResolver['hmr'] = {}, {
  plugins = [],
  server: serverOptions = {},
  beforePlugins = [],
}: {
  plugins?: Plugin[]
  server?: ServerOptions
  beforePlugins?: Plugin[]
} = {}) {
  const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
  mkdirSync(join(root, 'pages'))
  const plugin = pagesPlugin({
    dirs: 'pages',
    resolver: {
      resolveModuleIds: () => ['~pages'],
      resolveExtensions: () => ['tsx'],
      resolveRoutes: ctx => `export default ${JSON.stringify([
        ...ctx.pageRouteMap.values(),
      ])}`,
      getComputedRoutes: () => [],
      hmr,
    },
  })
  const server = await createServer({
    root,
    configFile: false,
    plugins: [
      ...beforePlugins,
      plugin,
      ...plugins,
    ],
    server: { watch: null, ws: false, ...serverOptions },
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
  const dispatch = (file: string, type: HotUpdateOptions['type'], timestamp = 123) => {
    const read = () => ''
    return (environment: DevEnvironment) => hotUpdate.call({ environment } as never, {
      type,
      file,
      timestamp,
      modules: [],
      read,
      server,
    } satisfies HotUpdateOptions)
  }

  return {
    server,
    environments,
    invalidations,
    sends,
    dispatch,
  }
}

describe('pages plugin', () => {
  it('keeps page-relative excludes consistent through real Vite file events', async () => {
    const root = slash(realpathSync(mkdtempSync(join(tmpdir(), '.vite-plugin-pages-[project]-'))))
    const dirs = ['src/pages', '.features/[feature]/pages']
    for (const dir of dirs) {
      mkdirSync(`${root}/${dir}/drafts`, { recursive: true })
      writeFileSync(`${root}/${dir}/home.vue`, '<template><div /></template>')
      writeFileSync(`${root}/${dir}/drafts/home.vue`, '<template><div /></template>')
    }
    let completed = Promise.withResolvers<void>()
    let events = 0
    const server = await createServer({
      root,
      configFile: false,
      plugins: [
        pagesPlugin({
          dirs: ['src/pages', '.features/*/pages'],
          exclude: ['drafts/**'],
        }),
        {
          name: 'observe-exclude-events',
          hotUpdate() {
            if (++events === Object.keys(server.environments).length)
              completed.resolve()
          },
        },
      ],
      server: { watch: null, ws: false },
    })
    onTestFinished(async () => {
      await server.close()
      rmSync(root, { recursive: true, force: true })
    })
    async function checkRoutes(title?: string, removed?: string) {
      for (const environment of Object.values(server.environments)) {
        const result = await environment.transformRequest('~pages')
        expect(result?.code).not.toContain('drafts')
        for (const dir of dirs) {
          if (dir === removed)
            expect(result?.code).not.toContain(`${dir}/home.vue`)
          else
            expect(result?.code).toContain(`${dir}/home.vue`)
        }
        if (title)
          expect(result?.code).toContain(title)
      }
    }
    async function emit(event: 'add' | 'change' | 'unlink', file: string) {
      events = 0
      completed = Promise.withResolvers<void>()
      server.watcher.emit(event, file)
      await completed.promise
    }
    await checkRoutes()
    for (const dir of dirs) {
      for (const excluded of [false, true]) {
        const path = `${root}/${dir}/${excluded ? 'drafts/' : ''}home.vue`
        writeFileSync(path, '<template><div /></template><route>{"meta":{"title":"Updated"}}</route>')
        await emit('change', path)
        await checkRoutes(excluded ? undefined : 'Updated')
        rmSync(path)
        await emit('unlink', path)
        await checkRoutes(undefined, excluded ? undefined : dir)
        writeFileSync(path, '<template><div /></template>')
        await emit('add', path)
        await checkRoutes()
      }
    }
  })

  it('preserves distinct files with the same timestamp in each environment', async () => {
    const added = vi.fn()
    const { server, environments, invalidations, sends, dispatch } = await createHotUpdateFixture({ added })
    const files = ['a', 'b'].map(name => `${server.config.root}/pages/${name}.tsx`)
    for (const file of files)
      writeFileSync(file, 'export default () => null')

    const updates = files.map(file => dispatch(file, 'create'))
    for (const environment of environments) {
      for (const update of updates)
        expect(await update(environment)).toEqual([])
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
    const { server, environments, invalidations, sends, dispatch } = await createHotUpdateFixture({ added, changed, removed })
    const file = `${server.config.root}/pages/home.tsx`
    writeFileSync(file, 'export default () => null')

    const updates = (['create', 'update', 'delete'] as const).map(type => dispatch(file, type))
    for (const environment of environments) {
      for (const update of updates)
        expect(await update(environment)).toEqual([])
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
    onTestFinished(() => {
      first.resolve()
      second.resolve()
    })
    const added = vi.fn((_ctx: PageContext, file: string) => file.endsWith('/a.tsx')
      ? first.promise
      : second.promise)
    const { server, environments, invalidations, dispatch } = await createHotUpdateFixture({ added })
    const files = ['a', 'b'].map(name => `${server.config.root}/pages/${name}.tsx`)
    for (const file of files)
      writeFileSync(file, 'export default () => null')

    const firstUpdates = environments.map(dispatch(files[0], 'create'))
    const secondUpdates = environments.map(dispatch(files[1], 'create'))
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

  it.each([124, 125])('keeps concurrent dispatches independent with the second timestamp %s', async (secondTimestamp) => {
    const first = Promise.withResolvers<boolean>()
    const second = Promise.withResolvers<boolean>()
    onTestFinished(() => {
      first.resolve(false)
      second.resolve(false)
    })
    const changed = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { server, environments, dispatch } = await createHotUpdateFixture({ changed })
    const file = `${server.config.root}/pages/home.tsx`
    writeFileSync(file, 'export default () => null')
    const create = dispatch(file, 'create')
    for (const environment of environments)
      await create(environment)

    const firstUpdates = environments.map(dispatch(file, 'update', 124))
    const secondUpdates = environments.map(dispatch(file, 'update', secondTimestamp))
    expect(changed).toHaveBeenCalledTimes(2)
    second.resolve(true)
    expect(await Promise.all(secondUpdates)).toEqual(environments.map(() => []))
    first.resolve(false)
    expect(await Promise.all(firstUpdates)).toEqual(environments.map(() => undefined))
  })

  it('refreshes real client and SSR modules after a burst of file events', async () => {
    const finished = Promise.withResolvers<void>()
    let events = 0
    const added = vi.fn()
    const { server, environments } = await createHotUpdateFixture({ added }, {
      plugins: [
        {
          name: 'observe-page-events',
          hotUpdate() {
            if (++events === 60)
              finished.resolve()
          },
        },
      ],
    })
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

  it.each([false, true, 'reject'])('processes a fresh dispatch with the same tuple after %s', async (outcome) => {
    const { server, environments, dispatch } = await createHotUpdateFixture()
    const handleFileChange = vi.spyOn(PageContext.prototype, 'handleFileChange')
    if (outcome === 'reject')
      handleFileChange.mockRejectedValueOnce(new Error('resolver failed'))
    else
      handleFileChange.mockResolvedValueOnce(outcome)
    handleFileChange.mockResolvedValue(true)
    const file = `${server.config.root}/pages/home.tsx`

    const first = dispatch(file, 'update')
    for (const environment of environments) {
      const update = first(environment)
      if (outcome === 'reject') {
        await expect(update).rejects.toThrow('resolver failed')
      }
      else {
        expect(await update).toEqual(outcome
          ? []
          : undefined)
      }
    }
    expect(handleFileChange).toHaveBeenCalledTimes(1)

    const second = dispatch(file, 'update')
    for (const environment of environments)
      expect(await second(environment)).toEqual([])
    expect(handleFileChange).toHaveBeenCalledTimes(2)
  })

  it.each(['client', 'ssr'])('does not reuse a tuple after only the %s hook runs', async (name) => {
    const { server, environments, dispatch } = await createHotUpdateFixture()
    const handleFileChange = vi.spyOn(PageContext.prototype, 'handleFileChange').mockResolvedValueOnce(false).mockResolvedValue(true)
    const participating = environments.filter(environment => environment.name === name)
    const file = `${server.config.root}/pages/home.tsx`
    const first = dispatch(file, 'update')
    for (const environment of participating)
      expect(await first(environment)).toBeUndefined()
    const second = dispatch(file, 'update')
    for (const environment of participating)
      expect(await second(environment)).toEqual([])
    expect(handleFileChange).toHaveBeenCalledTimes(2)
  })

  it.each([
    'parallel',
    'sequential',
    'client-only',
    'ssr-only',
    'none',
    'skip-client',
    'skip-ssr',
    'skip-all',
  ])('handles real dispatches with %s', async (mode) => {
    let completed = Promise.withResolvers<void>()
    const reads: HotUpdateOptions['read'][] = []
    const propagated: string[] = []
    const changed = vi.fn<(ctx: PageContext, file: string) => boolean>()
      .mockReturnValueOnce(false)
      .mockImplementation((ctx, file) => {
        const page = ctx.pageRouteMap.get(file)
        if (!page)
          throw new Error('Expected an existing page')
        page.route = 'revised'
        return true
      })
    const { server, environments, invalidations, sends, dispatch } = await createHotUpdateFixture({ changed }, {
      server: {
        async hotUpdateEnvironments(server, hmr) {
          const selected = mode === 'client-only'
            ? [server.environments.client]
            : mode === 'ssr-only'
              ? [server.environments.ssr]
              : mode === 'none'
                ? []
                : Object.values(server.environments)
          try {
            if (mode === 'sequential') {
              for (const environment of selected) {
                propagated.push(environment.name)
                await hmr(environment)
              }
            }
            else {
              await Promise.all(selected.map((environment) => {
                propagated.push(environment.name)
                return hmr(environment)
              }))
            }
          }
          finally {
            completed.resolve()
          }
        },
      },
      beforePlugins: [
        {
          name: 'trace-dispatch',
          enforce: 'pre',
          hotUpdate(options) {
            reads.push(options.read)
            options.timestamp = 123
            if (mode === `skip-${this.environment.name}` || mode === 'skip-all')
              throw new Error('Skip later environment callbacks')
          },
        },
      ],
    })
    const file = `${server.config.root}/pages/home.tsx`
    writeFileSync(file, 'export default () => null')
    const create = dispatch(file, 'create')
    for (const environment of environments)
      await create(environment)
    for (const environment of environments)
      await environment.transformRequest('~pages')
    for (const spy of [
      ...invalidations,
      ...sends,
    ])
      spy.mockClear()

    for (let event = 0; event < 2; event++) {
      completed = Promise.withResolvers<void>()
      writeFileSync(file, `export default () => ${event}`)
      server.watcher.emit('change', file)
      await completed.promise
    }

    expect(reads).toHaveLength(4)
    expect(reads[0]).toBe(reads[1])
    expect(reads[2]).toBe(reads[3])
    expect(reads[0]).not.toBe(reads[2])
    expect(changed).toHaveBeenCalledTimes(mode === 'skip-all'
      ? 0
      : 2)
    const selectedNames = mode === 'client-only'
      ? ['client']
      : mode === 'ssr-only'
        ? ['ssr']
        : mode === 'none'
          ? []
          : ['client', 'ssr']
    expect(propagated).toEqual([
      ...selectedNames,
      ...selectedNames,
    ])
    for (const [index, environment] of environments.entries()) {
      const skipped = mode === `skip-${environment.name}` || mode === 'skip-all'
      expect(invalidations[index]).toHaveBeenCalledTimes(skipped ? 0 : 1)
      const reloads = sends[index].mock.calls.filter(([payload]) => typeof payload !== 'string' && payload.type === 'full-reload')
      expect(reloads).toHaveLength(skipped ? 0 : 1)
      const result = await environment.transformRequest('~pages')
      expect(result?.code).toContain(`"route":"${skipped ? 'home' : 'revised'}"`)
    }
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
      const read = () => ''

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
          read,
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
