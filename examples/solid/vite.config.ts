import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import pages from 'vite-plugin-pages'
import windiCSS from 'vite-plugin-windicss'

export default defineConfig({
  plugins: [solid(), pages(), windiCSS()],
  build: {
    target: 'esnext',
    polyfillDynamicImport: false,
  },
})
