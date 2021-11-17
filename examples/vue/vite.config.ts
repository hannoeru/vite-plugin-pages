import { resolve } from 'path'
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
      // pages: ['src/pages', 'src/pages2'],
      pages: [
        // issue #68
        { dir: resolve(__dirname, './src/pages'), baseRoute: '' },
        { dir: 'src/features/**/pages', baseRoute: 'features' },
        { dir: 'src/admin/pages', baseRoute: 'admin' },
      ],
      extensions: ['vue', 'md'],
      syncIndex: true,
      replaceSquareBrackets: true,
      extendRoute(route) {
        if (route.name === 'about')
          route.props = (route: any) => ({ query: route.query.q })

        if (route.name === 'components') {
          return {
            ...route,
            beforeEnter: (route: any) => {
              // eslint-disable-next-line no-console
              console.log(route)
            },
          }
        }
      },
    }),
    Markdown(),
    Restart({
      restart: ['../../dist/*.js'],
    }),
  ],
})

export default config
