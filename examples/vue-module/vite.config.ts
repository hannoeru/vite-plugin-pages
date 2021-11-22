import { resolve } from 'path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'

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
      extensions: ['vue', 'md'],
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
  ],
})

export default config
