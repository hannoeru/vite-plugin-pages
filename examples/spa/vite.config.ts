import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import Markdown from 'vite-plugin-md'
import Restart from 'vite-plugin-restart'

const config = defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Pages({
      // pagesDir: ['src/pages', 'src/pages2'],
      pagesDir: [
        { dir: 'src/pages', baseRoute: '' },
        { dir: 'src/features/admin/pages', baseRoute: 'admin' },
      ],
      extensions: ['vue', 'md'],
      syncIndex: false,
      replaceSquareBrackets: true,
      extendRoute(route) {
        if (route.name === 'about')
          route.props = route => ({ query: route.query.q })
      },
    }),
    Markdown(),
    Restart({
      restart: ['../../dist/*.js'],
    }),
  ],
})

export default config
