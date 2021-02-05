// Pre-render the app into static HTML.
// run `yarn generate` and then `dist/static` can be served as a static site.
/* eslint-disable @typescript-eslint/no-var-requires */

import fs from 'fs'
import path from 'path'
import fg from 'fast-glob'

const toAbsolute = (p: string) => path.resolve(__dirname, p)

const manifest = require('./dist/static/ssr-manifest.json')
const template = fs.readFileSync(toAbsolute('dist/static/index.html'), 'utf-8')
const { render } = require('./dist/server/entry-server.js')
function ensureDirExist(filePath: string) {
  const dirname = path.dirname(filePath)
  if (fs.existsSync(dirname))
    return true

  ensureDirExist(dirname)
  fs.mkdirSync(dirname)
}

export async function build() {
  // determine routes to pre-render from src/pages
  const files = await fg('**/*.{vue,md}', { cwd: path.resolve(process.cwd(), 'src/pages') })
  const routesToPrerender = files
    .filter(i => !i.includes('['))
    .map((file) => {
      const name = file.replace(/\.vue$/, '').toLowerCase()
      return name === 'index' ? '/' : `/${name}`
    })

  console.log(routesToPrerender)

  // pre-render each route...
  for (const url of routesToPrerender) {
    const [appHtml, preloadLinks] = await render(url, manifest)

    const html = template
      .replace('<!--preload-links-->', preloadLinks)
      .replace('<!--app-html-->', appHtml)

    const filePath = `dist/static${url === '/' ? '/index' : url}.html`
    ensureDirExist(filePath)
    fs.writeFileSync(toAbsolute(filePath), html)
    console.log('pre-rendered:', filePath)
  }

  // done, delete ssr manifest
  fs.unlinkSync(toAbsolute('dist/static/ssr-manifest.json'))
}

build()
