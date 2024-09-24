import type { Browser, Page } from 'playwright'
import type { ViteDevServer } from 'vite'
import { existsSync } from 'node:fs'
import { copyFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { getViteConfig, stopServer } from './utils'

const root = resolve('./examples/react')

const srcPath = resolve('./test/data/test.tsx')
const distPath = resolve('./examples/react/src/pages/test.tsx')

describe('react e2e test', () => {
  let server: ViteDevServer
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    server = await createServer(getViteConfig(root))
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
    await page.goto(getUrl('/blog/today'), { waitUntil: 'networkidle' })
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('blog/today/index')
  })

  it('/blog/today/xxx - nested cache all', async () => {
    await page.goto(getUrl('/blog/today/xxx'), { waitUntil: 'networkidle' })
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('blog/today ...all route')
  })

  it('/xxx/xxx - cache all route', async () => {
    await page.goto(getUrl('/xxx/xxx'), { waitUntil: 'networkidle' })
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('...all route')
  })

  it('/blog/1b234bk12b3 - dynamic route', async () => {
    await page.goto(getUrl('/blog/1b234bk12b3'), { waitUntil: 'networkidle' })
    const text = await page.locator('body > div > p').textContent()
    expect(text?.trim()).toBe('blog/[id].tsx: 1b234bk12b3')
  })

  it('hmr - dynamic add /test route', async () => {
    await page.goto(getUrl('/'), { waitUntil: 'networkidle' })

    await copyFile(srcPath, distPath)

    // wait page reload
    await page.waitForLoadState('networkidle')

    await page.goto(getUrl('/test'), { waitUntil: 'networkidle' })

    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('this is test file')

    await rm(distPath)
  })
})
