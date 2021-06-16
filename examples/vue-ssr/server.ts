import fs from 'fs'
import path from 'path'
import express from 'express'
import { ViteDevServer } from 'vite'

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD

async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production',
) {
  const resolve = (p: string) => path.resolve(__dirname, p)

  const indexProd = isProd
    ? fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
    : ''

  const manifest = isProd
    ? await import('./dist/client/ssr-manifest.json')
    : {}

  const app = express()

  let vite: ViteDevServer
  if (!isProd) {
    vite = await import('vite').then(i => i.createServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: {
        middlewareMode: true,
      },
    }))
    // use vite's connect instance as middleware
    app.use(vite.middlewares)
  } else {
    app.use(await import('compression').then(i => i.default()))
    app.use(await import('serve-static')
      .then(i => i.default(resolve('dist/client'), {
        index: false,
      })),
    )
  }

  app.use('*', async(req, res) => {
    try {
      const url = req.originalUrl

      let template, render
      if (!isProd) {
        // always read fresh template in dev
        template = fs.readFileSync(resolve('index.html'), 'utf-8')
        template = await vite.transformIndexHtml(url, template)
        // @ts-ignore
        render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
      } else {
        template = indexProd
        // @ts-ignore
        render = await import('./dist/server/entry-server.js').then(i => i.render)
      }

      const [appHtml, preloadLinks] = await render(url, manifest)

      const html = template
        .replace('<!--preload-links-->', preloadLinks)
        .replace('<!--app-html-->', appHtml)

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      // @ts-ignore
      vite && vite.ssrFixStacktrace(e)
      // eslint-disable-next-line no-console
      console.log(e.stack)
      res.status(500).end(e.stack)
    }
  })

  // @ts-ignore
  return { app, vite }
}

if (!isTest) {
  createServer().then(({ app }) =>
    app.listen(3000, () => {
      // eslint-disable-next-line no-console
      console.log('🚀  Server listening on http://localhost:3000')
    }),
  )
}

// for test use
export default createServer
