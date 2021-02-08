import { defineConfig } from 'vite'
import VuePlugin from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'

const config = defineConfig({
  plugins: [
    VuePlugin(),
    Pages(),
  ],
  build: {
    minify: false,
  },
})

export default config
