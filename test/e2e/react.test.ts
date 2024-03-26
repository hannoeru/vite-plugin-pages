import { resolve } from 'node:path'
import { copyFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import type { Browser, Page } from 'playwright'
import type { ViteDevServer } from 'vite'
import { getViteConfig, stopServer } from './utils'

const vueRoot = resolve('./examples/react')

const srcPath = resolve('./test/data/test.tsx')
const distPath = resolve('./examples/react/src/pages/test.tsx')

describe('react e2e test', () => {
  let server: ViteDevServer
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    server = await createServer(getViteConfig(vueRoot))
    await server.listen()
    browser = await chromium.launch()
    page = await browser.newPage()
  })

  afterAll(async () => {
    // HMR test file
    if (existsSync(distPath))
      await rm(distPath)
    await browser.close()
    await stopServer(server)
  })

  const getUrl = (path: string) => `http://localhost:${server.config.server.port}${path}`

  it('/blog/today have content', async () => {
    await page.goto(getUrl('/blog/today'))
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('blog/today/index')
  })

  it('/blog/today/xxx - nested cache all', async () => {
    await page.goto(getUrl('/blog/today/xxx'))
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('blog/today ...all route')
  })

  it('/xxx/xxx - cache all route', async () => {
    await page.goto(getUrl('/xxx/xxx'))
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('...all route')
  })

  it('/blog/1b234bk12b3 - dynamic route', async () => {
    await page.goto(getUrl('/blog/1b234bk12b3'))
    const text = await page.locator('body > div > p').textContent()
    expect(text?.trim()).toBe('blog/[id].tsx: 1b234bk12b3')
  })

  it('hmr - dynamic add /test route', async () => {
    await page.goto(getUrl('/'))

    await copyFile(srcPath, distPath)

    // wait page reload
    await page.waitForLoadState('networkidle')

    await page.goto(getUrl('/test'))

    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('this is test file')

    await rm(distPath)
  })
})
