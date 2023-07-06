import { resolve } from 'path'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import pages from 'vite-plugin-pages'

export default defineConfig({
  plugins: [
    solid(),
    pages({
      dirs: [
        { dir: resolve(__dirname, './src/pages'), baseRoute: '' },
        { dir: 'src/features/**/pages', baseRoute: 'features' },
        { dir: 'src/admin/pages', baseRoute: 'admin' },
      ],
      extensions: ['tsx', 'md'],
      dts: true,
    }),
  ],
  build: {
    target: 'esnext',
  },
})
