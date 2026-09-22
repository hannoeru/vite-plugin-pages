import type { PreviewServer, UserConfig, ViteDevServer } from 'vite'

type TestServer = PreviewServer | ViteDevServer

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

export function getServerOrigin(server: TestServer) {
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string')
    throw new Error('The test server is not listening on a TCP port.')

  return `http://localhost:${address.port}`
}

export async function stopServer(server: TestServer) {
  const { httpServer } = server
  if (!httpServer)
    return

  return new Promise<void>((resolve, reject) => httpServer.close((error) => {
    if (error)
      reject(error)
    else
      resolve()
  }))
}
