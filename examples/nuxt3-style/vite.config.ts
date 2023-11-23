import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from '../../src'
import Markdown from 'vite-plugin-vue-markdown'

const config = defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Pages({
      dirs: [
        { dir: 'src/pages', baseRoute: '' },
        { dir: 'src/features/**/pages', baseRoute: 'features' },
        { dir: 'src/admin/pages', baseRoute: 'admin' },
      ],
      extensions: ['vue', 'md'],
      syncIndex: false,
      routeStyle: 'nuxt3',
    }),
    Markdown(),
  ],
})

export default config
