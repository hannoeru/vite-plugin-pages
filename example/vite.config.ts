import { UserConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Route from 'vite-plugin-pages'

const config: UserConfig = {
  plugins: [
    Vue(),
    Route({
      importMode(path: string) {
        return path === '/src/pages/index.vue' ? 'sync' : 'async'
      },
    }),
  ],
}

export default config
