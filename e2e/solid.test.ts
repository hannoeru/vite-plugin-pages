import { resolve } from 'node:path'
import { copyFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import type { Browser, Page } from 'playwright'
import type { ViteDevServer } from 'vite'
import { getViteConfig, stopServer } from './utils'

const root = resolve('./examples/solid')

const srcPath = resolve('./test/data/test.tsx')
const distPath = resolve(`${root}/src/pages/test.tsx`)

describe('solid e2e test', () => {
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
    expect(text?.trim()).toBe('blog/today/index.tsx')
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

  it('/about/1b234bk12b3/more deep nested dynamic route', async () => {
    await page.goto(getUrl('/about/1b234bk12b3/more'), { waitUntil: 'networkidle' })
    const text = await page.locator('div.deep-more').textContent()
    expect(text?.trim()).toBe('deep nested: about/[id]/more.tsx')
  })

  it('/features/dashboard custom routes folder', async () => {
    await page.goto(getUrl('/features/dashboard'), { waitUntil: 'networkidle' })
    const text = await page.locator('body > div > p >> nth=0').textContent()
    expect(text?.trim()).toBe('features/dashboard/pages/dashboard.tsx')
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
