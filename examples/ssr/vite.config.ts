import { defineConfig } from 'vite'
import VuePlugin from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import Restart from 'vite-plugin-restart'

const config = defineConfig({
  plugins: [
    VuePlugin(),
    Pages(),
    Restart({
      restart: ['../../dist/*.js'],
    }),
  ],
  build: {
    minify: false,
  },
})

export default config
