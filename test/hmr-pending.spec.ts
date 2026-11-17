import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { createServer } from 'vite'
import pagesPlugin from '../src'

const vuePage = '<template><div /></template>'

function createSignal() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('dev route module', () => {
  it.each([
    { load: 'a later load', loadedBefore: true },
    { load: 'the first load', loadedBefore: false },
  ])('drops a route module from $load while a page is added', async ({ loadedBefore }) => {
    const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    onTestFinished(() => rmSync(root, { recursive: true, force: true }))
    mkdirSync(join(root, 'src/pages'), { recursive: true })
    writeFileSync(join(root, 'src/pages/index.vue'), vuePage)

    const generationHeld = createSignal()
    const generationReleased = createSignal()
    let hotUpdated = createSignal()
    let holdGeneration = false
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [
        pagesPlugin({
          async onRoutesGenerated() {
            if (holdGeneration) {
              holdGeneration = false
              generationHeld.resolve()
              await generationReleased.promise
            }
          },
        }),
        {
          name: 'hot-update-done',
          hotUpdate() {
            if (this.environment.name === 'client')
              hotUpdated.resolve()
          },
        },
      ],
      server: { watch: null, ws: false },
    })
    onTestFinished(async () => {
      generationReleased.resolve()
      await server.close()
    })
    const client = server.environments.client

    if (loadedBefore) {
      await client.transformRequest('~pages')
      const first = `${server.config.root}/src/pages/first.vue`
      writeFileSync(first, vuePage)
      server.watcher.emit('add', first)
      await hotUpdated.promise
      hotUpdated = createSignal()
    }

    holdGeneration = true
    const staleRequest = client.transformRequest('~pages')
    await generationHeld.promise

    const added = `${server.config.root}/src/pages/new.vue`
    writeFileSync(added, vuePage)
    server.watcher.emit('add', added)
    await hotUpdated.promise

    generationReleased.resolve()
    expect((await staleRequest)?.code).not.toContain('"path":"/new"')

    expect((await client.transformRequest('~pages'))?.code).toContain('"path":"/new"')
  })

  it('reloads routes for SSR module loading after a page is added', async () => {
    const root = slash(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-')))
    onTestFinished(() => rmSync(root, { recursive: true, force: true }))
    mkdirSync(join(root, 'src/pages'), { recursive: true })
    writeFileSync(join(root, 'src/pages/index.ts'), 'export default {}')
    const hotUpdated = createSignal()
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [
        pagesPlugin(),
        {
          name: 'hot-update-done',
          hotUpdate() {
            if (this.environment.name === 'ssr')
              hotUpdated.resolve()
          },
        },
      ],
      server: { watch: null, ws: false },
    })
    onTestFinished(() => server.close())
    const loadPaths = async () => (await server.ssrLoadModule('~pages')).default.map((route: { path: string }) => route.path)

    expect(await loadPaths()).toEqual(['/'])

    const added = `${server.config.root}/src/pages/new.ts`
    writeFileSync(added, 'export default {}')
    server.watcher.emit('add', added)
    await hotUpdated.promise

    expect((await loadPaths()).sort()).toEqual(['/', '/new'])
  })
})
