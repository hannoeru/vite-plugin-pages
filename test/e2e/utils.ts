import type { UserConfig, ViteDevServer } from 'vite'

export const getViteConfig = (root: string): UserConfig => ({
  root,
  logLevel: 'silent',
  server: {
    host: true,
  },
  build: {
    target: 'esnext',
  },
})

export const stopServer = async(server: ViteDevServer) => {
  return new Promise<void>((resolve, reject) => server.httpServer?.close((err) => {
    if (err) reject(err)
    resolve()
  }))
}
