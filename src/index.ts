import { resolve } from 'path'
import type { Plugin } from 'vite'
import { Route, ResolvedOptions, UserOptions } from './types'
import { getPageFiles } from './files'
import { generateRoutes, generateClientCode, updateRouteFromHMR } from './generate'
import { debug, getPagesVirtualModule, isTarget, slash, replaceSquareBrackets } from './utils'
import { parseVueRequest } from './query'
import { resolveOptions } from './options'
import { MODULE_IDS, MODULE_ID_VIRTUAL } from './constants'

function pagesPlugin(userOptions: UserOptions = {}): Plugin {
  let generatedRoutes: Route[] | null = null

  const options: ResolvedOptions = resolveOptions(userOptions)

  return {
    name: 'vite-plugin-pages',
    enforce: 'pre',
    configResolved({ root }) {
      options.root = root
    },
    configureServer(server) {
      const { ws, watcher } = server

      function fullReload() {
        // invalidateModule
        getPagesVirtualModule(server)
        ws.send({
          type: 'full-reload',
        })
      }

      watcher.on('add', (file) => {
        if (isTarget(file, options)) {
          debug.hmr('add', file)
          generatedRoutes = null
          fullReload()
        }
      })
      watcher.on('unlink', (file) => {
        if (isTarget(file, options)) {
          debug.hmr('remove', file)
          generatedRoutes = null
          fullReload()
        }
      })
      watcher.on('change', (file) => {
        if (isTarget(file, options) && generatedRoutes) {
          const needReload = updateRouteFromHMR(file, generatedRoutes, options)
          if (needReload) {
            debug.hmr('change', file)
            fullReload()
          }
        }
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
        for (const pageDir of options.pagesDirOptions) {
          const pageDirPath = slash(resolve(options.root, pageDir.dir))
          debug.gen('dir: %O', pageDirPath)

          const files = await getPageFiles(pageDirPath, options)
          debug.gen('files: %O', files)

          const routes = generateRoutes(files, pageDir, options)
          generatedRoutes.push(...routes)
        }
        // only execute onRoutesGenerated once
        generatedRoutes = (await options.onRoutesGenerated?.(generatedRoutes)) || generatedRoutes
      }
      debug.gen('routes: %O', generatedRoutes)

      let clientCode = generateClientCode(generatedRoutes, options)
      clientCode = (await options.onClientGenerated?.(clientCode)) || clientCode
      // debug.gen('client code: %O', clientCode)

      return clientCode
    },
    async transform(_code: string, id: string) {
      const { query } = parseVueRequest(id)

      if (query && query.vue && query.type === 'route') {
        return {
          code: 'export default {}',
          map: null,
        }
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
