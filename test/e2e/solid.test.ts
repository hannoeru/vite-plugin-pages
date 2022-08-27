import { resolve } from 'path'
import { copyFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { getViteConfig, stopServer } from './utils'
import type { Browser, Page } from 'playwright'
import type { ViteDevServer } from 'vite'

const solidRoot = resolve('./examples/solid')

const srcPath = resolve('./test/data/test.tsx')
const distPath = resolve(`${solidRoot}/src/pages/test.tsx`)

describe('solid e2e test', () => {
  let server: ViteDevServer
  let browser: Browser
  let page: Page

  beforeAll(async() => {
    server = await createServer(getViteConfig(solidRoot))
    await server.listen(0)
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
    await page.goto(getUrl('/blog/today'), { waitUntil: 'networkidle' })
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('blog/today/index.tsx')
  })

  test('/blog/today/xxx - nested cache all', async() => {
    await page.goto(getUrl('/blog/today/xxx'), { waitUntil: 'networkidle' })
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('blog/today ...all route')
  })

  test('/xxx/xxx - cache all route', async() => {
    await page.goto(getUrl('/xxx/xxx'), { waitUntil: 'networkidle' })
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('...all route')
  })

  test('/about/1b234bk12b3/more deep nested dynamic route', async() => {
    await page.goto(getUrl('/about/1b234bk12b3/more'), { waitUntil: 'networkidle' })
    const text = await page.locator('div.deep-more').textContent()
    expect(text?.trim()).toBe('deep nested: about/[id]/more.tsx')
  })

  test('/features/dashboard custom routes folder', async() => {
    await page.goto(getUrl('/features/dashboard'), { waitUntil: 'networkidle' })
    const text = await page.locator('body > div > p >> nth=0').textContent()
    expect(text?.trim()).toBe('features/dashboard/pages/dashboard.tsx')
  })

  test('hmr - dynamic add /test route', async() => {
    await page.goto(getUrl('/'), { waitUntil: 'networkidle' })

    await copyFile(srcPath, distPath)

    await page.goto(getUrl('/'), { waitUntil: 'networkidle' })
    await page.goto(getUrl('/test'), { waitUntil: 'networkidle' })

    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('this is test file')

    await rm(distPath)
  })
})
