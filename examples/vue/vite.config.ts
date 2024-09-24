import { resolve } from 'node:path'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import Pages from 'vite-plugin-pages'
import Markdown from 'vite-plugin-vue-markdown'

const config = defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Pages({
      dirs: [
        // issue #68
        { dir: resolve(__dirname, './src/pages'), baseRoute: '' },
        { dir: 'src/features/**/pages', baseRoute: 'features' },
        { dir: 'src/admin/pages', baseRoute: 'admin' },
      ],
      extensions: ['vue', 'md', 'jsx'],
      extendRoute(route: any) {
        if (route.name === 'about')
          route.props = (route: any) => ({ query: route.query.q })

        if (route.name === 'components') {
          return {
            ...route,
            beforeEnter: (route: any) => {
              console.log(route)
            },
          }
        }
      },
    }),
    // test multiple instances
    Pages({
      dirs: '../react/src/pages',
      resolver: 'react',
      moduleId: '~admin-pages',
    }),
    Markdown(),
    Inspect(),
  ],
})

export default config
