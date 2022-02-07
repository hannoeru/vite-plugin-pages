import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import Markdown from 'vite-plugin-md'

const config = defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Pages({
      dirs: [
        { dir: 'src/pages', baseRoute: '' },
        { dir: 'src/features/admin/pages', baseRoute: 'admin' },
      ],
      extensions: ['vue', 'md'],
      syncIndex: false,
      nuxtStyle: true,
    }),
    Markdown(),
  ],
})

export default config
