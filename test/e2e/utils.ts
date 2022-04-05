import { chromium } from 'playwright'
import type { Browser } from 'playwright'
import type { UserConfig } from 'vite'

export const getViteConfig = (root: string): UserConfig => ({
  root,
  logLevel: 'silent',
  server: {
    watch: {
      // During tests we edit the files too fast and sometimes chokidar
      // misses change events, so enforce polling for consistency
      usePolling: true,
      interval: 100,
    },
    host: true,
  },
  build: {
    target: 'esnext',
  },
})

let browser: Browser

export const getBrowser = async() => {
  if (!browser)
    browser = await chromium.launch()

  return browser
}
