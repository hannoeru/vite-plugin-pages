/* eslint-disable jest/no-conditional-expect */
/* eslint-disable no-console */
import { resolve } from 'path'
import { copyFile, rm } from 'fs/promises'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import type { Browser, Page } from 'playwright'
import type { ViteDevServer } from 'vite'

const vueRoot = resolve('./examples/vue')

describe('vue e2e test', () => {
  let server: ViteDevServer
  let browser: Browser
  let page: Page

  beforeAll(async() => {
    server = await createServer({
      root: vueRoot,
      build: {
        target: 'esnext',
      },
    })
    await server.listen()
    browser = await chromium.launch()
    page = await browser.newPage()
  })

  afterAll(async() => {
    await browser.close()
    server.httpServer.close()
  })

  const getUrl = (path: string) => `http://localhost:${server.config.server.port}${path}`

  test('/blog/today have content', async() => {
    try {
      await page.goto(getUrl('/blog/today'))
      const text = await page.locator('body > div').textContent()
      expect(text.trim()).toBe('blog/today/index.vue')
    } catch (e) {
      console.error(e)
      expect(e).toBeUndefined()
    }
  })

  test('/blog/today/xxx - nested cache all', async() => {
    try {
      await page.goto(getUrl('/blog/today/xxx'))
      const text = await page.locator('body > div').textContent()
      expect(text.trim()).toBe('blog/today ...all route')
    } catch (e) {
      console.error(e)
      expect(e).toBeUndefined()
    }
  })

  test('/markdown have markdown content', async() => {
    try {
      await page.goto(getUrl('/markdown'))
      const text = await page.locator('body > div > div > h1').textContent()
      expect(text.trim()).toBe('hello from markdown file')
    } catch (e) {
      console.error(e)
      expect(e).toBeUndefined()
    }
  })

  test('/xxx/xxx - cache all route', async() => {
    try {
      await page.goto(getUrl('/xxx/xxx'))
      const text = await page.locator('body > div').textContent()
      expect(text.trim()).toBe('...all route')
    } catch (e) {
      console.error(e)
      expect(e).toBeUndefined()
    }
  })

  test('/about/1b234bk12b3/more deep nested dynamic route', async() => {
    try {
      await page.goto(getUrl('/about/1b234bk12b3/more'))
      const text = await page.locator('div.deep-more').textContent()
      expect(text.trim()).toBe('deep nested: about/[id]/more.vue')
    } catch (e) {
      console.error(e)
      expect(e).toBeUndefined()
    }
  })

  test('/features/dashboard custom routes folder', async() => {
    try {
      await page.goto(getUrl('/features/dashboard'))
      const text = await page.locator('body > div > p >> nth=0').textContent()
      expect(text.trim()).toBe('features/dashboard/pages/dashboard.vue')
    } catch (e) {
      console.error(e)
      expect(e).toBeUndefined()
    }
  })

  test('hmr - dynamic add /test route works', async() => {
    const srcPath = resolve('./test/data/test.vue')
    const distPath = resolve('./examples/vue/src/pages/test.vue')

    try {
      await page.goto(getUrl('/'))

      await copyFile(srcPath, distPath)

      await page.goto(getUrl('/'), { waitUntil: 'networkidle' })
      await page.goto(getUrl('/test'))

      const text = await page.locator('body > div').textContent()
      expect(text.trim()).toBe('this is test file')

      await rm(distPath)
    } catch (e) {
      await rm(distPath)
      console.error(e)
      expect(e).toBeUndefined()
    }
  })
})
