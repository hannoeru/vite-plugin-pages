import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
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
  it('drops a route module that was generated while a page was added', async () => {
    const root = slash(realpathSync.native(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))))
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

    await client.transformRequest('~pages')
    writeFileSync(join(root, 'src/pages/first.vue'), vuePage)
    server.watcher.emit('add', `${root}/src/pages/first.vue`)
    await hotUpdated.promise
    hotUpdated = createSignal()

    holdGeneration = true
    const staleRequest = client.transformRequest('~pages')
    await generationHeld.promise

    writeFileSync(join(root, 'src/pages/new.vue'), vuePage)
    server.watcher.emit('add', `${root}/src/pages/new.vue`)
    await hotUpdated.promise

    generationReleased.resolve()
    expect((await staleRequest)?.code).not.toContain('"path":"/new"')

    expect((await client.transformRequest('~pages'))?.code).toContain('"path":"/new"')
  })
})
