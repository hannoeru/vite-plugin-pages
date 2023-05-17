import { resolve } from 'path'
import { copyFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { getViteConfig, stopServer } from './utils'
import type { Browser, Page } from 'playwright'
import type { ViteDevServer } from 'vite'

const vueRoot = resolve('./examples/vue')

const srcPath = resolve('./test/data/test.vue')
const distPath = resolve('./examples/vue/src/pages/test.vue')

describe('vue e2e test', () => {
  let server: ViteDevServer
  let browser: Browser
  let page: Page

  beforeAll(async() => {
    server = await createServer(getViteConfig(vueRoot))
    await server.listen()
    browser = await chromium.launch()
    page = await browser.newPage()
  })

  afterAll(async() => {
    // HMR test file
    if (existsSync(distPath))
      await rm(distPath)
    await browser.close()
    await stopServer(server)
  })

  const getUrl = (path: string) => `http://localhost:${server.config.server.port}${path}`

  test('/blog/today have content', async() => {
    await page.goto(getUrl('/blog/today'))
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('blog/today/index.vue')
  })

  test('/blog/today/xxx - nested cache all', async() => {
    await page.goto(getUrl('/blog/today/xxx'))
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('blog/today ...all route')
  })

  test('/markdown have markdown content', async() => {
    await page.goto(getUrl('/markdown'))
    const text = await page.locator('body > div > div > h1').textContent()
    expect(text?.trim()).toBe('hello from markdown file')
  })

  test('/xxx/xxx - cache all route', async() => {
    await page.goto(getUrl('/xxx/xxx'))
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('...all route')
  })

  test('/about/1b234bk12b3/more deep nested dynamic route', async() => {
    await page.goto(getUrl('/about/1b234bk12b3/more'))
    const text = await page.locator('div.deep-more').textContent()
    expect(text?.trim()).toBe('deep nested: about/[id]/more.vue')
  })

  test('/features/dashboard custom routes folder', async() => {
    await page.goto(getUrl('/features/dashboard'))
    const text = await page.locator('body > div > p >> nth=0').textContent()
    expect(text?.trim()).toBe('features/dashboard/pages/dashboard.vue')
  })

  test('hmr - dynamic add /test route works', async() => {
    await page.goto(getUrl('/'))

    await copyFile(srcPath, distPath)

    await page.goto(getUrl('/'), { waitUntil: 'networkidle' })
    await page.goto(getUrl('/test'))

    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('this is test file')

    await rm(distPath)
  })
})
