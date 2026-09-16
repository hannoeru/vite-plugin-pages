import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    Pages({
      dirs: [
        { dir: 'src/pages', filePattern: '**/*.page.tsx' },
        { dir: 'src/pages', baseRoute: 'admin', filePattern: '**/*.view.tsx' },
      ],
      extendRoute(route: any) {
        if (route.path === 'about.page')
          route.props = (route: any) => ({
            label: 'hello world',
            url: 'https://example.com',
          })
      },
    }),
  ],
})
