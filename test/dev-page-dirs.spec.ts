import type { UserOptions } from '../src'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { createServer } from 'vite'
import pagesPlugin from '../src'

const vuePage = '<template><div /></template>'

async function startServer(root: string, options: UserOptions) {
  const hotUpdates = new Map<string, () => void>()
  let watcherReady!: () => void
  const ready = new Promise<void>((resolve) => {
    watcherReady = resolve
  })
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      pagesPlugin(options),
      {
        name: 'hot-update-done',
        configureServer(server) {
          server.watcher.once('ready', watcherReady)
        },
        hotUpdate({ file }) {
          if (this.environment.name === 'client')
            hotUpdates.get(file)?.()
        },
      },
    ],
    server: { ws: false },
  })
  onTestFinished(() => server.close())
  await ready

  return {
    async addPage(file: string) {
      const updated = new Promise<void>((resolve) => {
        hotUpdates.set(file, resolve)
      })
      mkdirSync(join(file, '..'), { recursive: true })
      writeFileSync(file, vuePage)
      await updated
    },
    async routePaths() {
      const code = (await server.environments.client.transformRequest('~pages'))!.code
      return [
        ...code.matchAll(/"path":"([^"]*)"/g),
      ].map(match => match[1]).sort()
    },
  }
}

function createRoot() {
  const root = slash(realpathSync.native(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  return root
}

describe('dev page directories', () => {
  it('adds a page in a new directory that matches a dirs glob', async () => {
    const root = createRoot()
    mkdirSync(join(root, 'src/features/a/pages'), { recursive: true })
    writeFileSync(join(root, 'src/features/a/pages/index.vue'), vuePage)
    const server = await startServer(root, {
      dirs: [
        { dir: 'src/features/*/pages', baseRoute: 'features' },
      ],
    })
    expect(await server.routePaths()).toEqual(['/features'])

    await server.addPage(`${root}/src/features/b/pages/new.vue`)

    expect(await server.routePaths()).toEqual(['/features', '/features/new'])
  })

  it('adds the first page when the pages directory does not exist at start', async () => {
    const root = createRoot()
    const server = await startServer(root, {})
    expect(await server.routePaths()).toEqual([])

    await server.addPage(`${root}/src/pages/index.vue`)

    expect(await server.routePaths()).toEqual(['/'])
  })

  it('adds a page in a directory outside the Vite root', async () => {
    const base = createRoot()
    const root = `${base}/app`
    mkdirSync(join(root, 'src/pages'), { recursive: true })
    mkdirSync(join(base, 'shared/pages'), { recursive: true })
    writeFileSync(join(base, 'shared/pages/index.vue'), vuePage)
    const server = await startServer(root, { dirs: '../shared/pages' })
    expect(await server.routePaths()).toEqual(['/'])

    await server.addPage(`${base}/shared/pages/new.vue`)

    expect(await server.routePaths()).toEqual(['/', '/new'])
  })

  it('does not change the user dirs option', async () => {
    const root = createRoot()
    const dirs = [
      { dir: 'src/pages', baseRoute: '/docs/' },
    ]
    await startServer(root, { dirs })

    expect(dirs).toEqual([
      { dir: 'src/pages', baseRoute: '/docs/' },
    ])
  })
})
