import { resolve } from 'path'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import pages from 'vite-plugin-pages'
import windiCSS from 'vite-plugin-windicss'

export default defineConfig({
  plugins: [
    solid(),
    pages({
      dirs: [
      // issue #68
        { dir: resolve(__dirname, './src/pages'), baseRoute: '' },
        { dir: 'src/features/**/pages', baseRoute: 'features' },
        { dir: 'src/admin/pages', baseRoute: 'admin' },
      ],
      extensions: ['tsx', 'md'],
    }),
    windiCSS(),
  ],
  build: {
    target: 'esnext',
    polyfillDynamicImport: false,
  },
})
