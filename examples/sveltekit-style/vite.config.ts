import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import Markdown from 'vite-plugin-vue-markdown'

const config = defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Pages({
      dirs: [
        { dir: 'src/newPages', baseRoute: '' },
      ],
      extensions: ['vue', 'md'],
      syncIndex: false,
      routeStyle: 'sveltekit',
    }),
    Markdown(),
  ],
})

export default config
