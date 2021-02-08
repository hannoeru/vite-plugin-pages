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
      pagesDir: ['src/pages', 'src/pages2'],
      extensions: ['vue', 'md'],
      syncIndex: false,
    }),
    Markdown(),
  ],
})

export default config
