import { UserConfig } from 'vite'
import VuePlugin from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'

const config: UserConfig = {
  plugins: [
    VuePlugin(),
    Pages(),
  ],
  build: {
    minify: false,
  },
}

export default config
