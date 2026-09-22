import type { Browser, Page } from 'playwright'
import type { PreviewServer } from 'vite'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { build, preview } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServerOrigin, getViteConfig, stopServer } from './utils'

const root = resolve('./examples/react')
const buildPath = resolve(root, 'dist')
const base = '/app/'

describe('non-root base e2e test', () => {
  let server: PreviewServer
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    const config = {
      ...getViteConfig(root),
      base,
    }

    await build(config)
    server = await preview({
      ...config,
      preview: {
        host: true,
        port: 0,
      },
    })
    browser = await chromium.launch()
    page = await browser.newPage()
  })

  afterAll(async () => {
    if (existsSync(buildPath))
      await rm(buildPath, { recursive: true })
    await browser.close()
    await stopServer(server)
  })

  it('serves a production route below the domain root', async () => {
    await page.goto(`${getServerOrigin(server)}${base}blog/today`, { waitUntil: 'networkidle' })
    const text = await page.locator('body > div').textContent()
    expect(text?.trim()).toBe('blog/today/index')
  })
})
