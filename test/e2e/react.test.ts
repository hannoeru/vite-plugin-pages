/* eslint-disable jest/no-conditional-expect */
/* eslint-disable no-console */
import { resolve } from 'path'
import { copyFile, rm } from 'fs/promises'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import type { Browser, Page } from 'playwright'
import type { ViteDevServer } from 'vite'

const vueRoot = resolve('./examples/react')

describe('react e2e test', () => {
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
      expect(text.trim()).toBe('blog/today/index')
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

  test('/blog/1b234bk12b3 - dynamic route', async() => {
    try {
      await page.goto(getUrl('/blog/1b234bk12b3'))
      const text = await page.locator('body > div > p').textContent()
      expect(text.trim()).toBe('blog/[id].tsx: 1b234bk12b3')
    } catch (e) {
      console.error(e)
      expect(e).toBeUndefined()
    }
  })

  test('hmr - dynamic add /test route', async() => {
    const srcPath = resolve('./test/data/test.tsx')
    const distPath = resolve('./examples/react/src/pages/test.tsx')

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
