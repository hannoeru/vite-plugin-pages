import type { UserConfig, ViteDevServer } from 'vite'

export function getViteConfig(root: string): UserConfig {
  return {
    root,
    logLevel: 'silent',
    server: {
      host: true,
    },
    build: {
      target: 'esnext',
    },
  }
}

export async function stopServer(server: ViteDevServer) {
  return new Promise<void>((resolve, reject) => server.httpServer?.close((err) => {
    if (err)
      reject(err)
    resolve()
  }))
}
