import type { Plugin } from 'vite'
import { Route, ResolvedOptions, UserOptions, ResolvedPages } from './types'
import { generateRoutes, generateClientCode } from './generate'
import { debug, replaceSquareBrackets } from './utils'
import { resolveOptions } from './options'
import { MODULE_IDS, MODULE_ID_VIRTUAL } from './constants'
import { resolvePages } from './pages'
import { handleHMR } from './hmr'

function pagesPlugin(userOptions: UserOptions = {}): Plugin {
  let generatedRoutes: Route[] | null = null
  let options: ResolvedOptions
  let pages: ResolvedPages

  return {
    name: 'vite-plugin-pages',
    enforce: 'pre',
    configResolved({ root }) {
      options = resolveOptions(userOptions, root)
      pages = resolvePages(options)
      debug.options(options)
      debug.pages(pages)
    },
    configureServer(server) {
      handleHMR(server, pages, options, () => {
        generatedRoutes = null
      })
    },
    resolveId(id) {
      return MODULE_IDS.includes(id) || MODULE_IDS.some(i => id.startsWith(i))
        ? MODULE_ID_VIRTUAL
        : null
    },
    async load(id) {
      if (id !== MODULE_ID_VIRTUAL)
        return

      if (!generatedRoutes) {
        generatedRoutes = []
        generatedRoutes = generateRoutes(pages, options)
        generatedRoutes = (await options.onRoutesGenerated?.(generatedRoutes)) || generatedRoutes
      }
      debug.gen('routes: %O', generatedRoutes)

      let clientCode = generateClientCode(generatedRoutes, options)
      clientCode = (await options.onClientGenerated?.(clientCode)) || clientCode
      // debug.gen('client code: %O', clientCode)

      return clientCode
    },
    async transform(_code, id) {
      if (!/vue&type=route/.test(id)) return
      return {
        code: 'export default {}',
        map: null,
      }
    },
    generateBundle(_options, bundle) {
      if (options.replaceSquareBrackets)
        replaceSquareBrackets(bundle)
    },
  }
}

export * from './types'
export { generateRoutes }
export default pagesPlugin
