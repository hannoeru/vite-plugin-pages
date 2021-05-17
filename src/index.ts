import { resolve } from 'path'
import type { Plugin } from 'vite'
import { Route, ResolvedOptions, UserOptions } from './types'
import { getPageFiles, getPageDirs } from './files'
import { generateRoutes, generateClientCode, isRouteBlockChanged } from './generate'
import { debug, getPagesVirtualModule, isTarget, slash, replaceSquareBrackets, isDynamicRoute, isCatchAllRoute } from './utils'
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
        const path = slash(file)
        if (isTarget(path, options)) {
          debug.hmr('add', path)
          generatedRoutes = null
          fullReload()
        }
      })
      watcher.on('unlink', (file) => {
        const path = slash(file)
        if (isTarget(path, options)) {
          debug.hmr('remove', path)
          generatedRoutes = null
          fullReload()
        }
      })
      watcher.on('change', (file) => {
        const path = slash(file)
        if (isTarget(path, options) && generatedRoutes) {
          const needReload = isRouteBlockChanged(path, generatedRoutes, options)
          if (needReload) {
            debug.hmr('change', path)
            generatedRoutes = null
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

        for (const pageDirGlob of options.pagesDirOptions) {
          const pageDirs = await getPageDirs(pageDirGlob, options)
          for (const pageDir of pageDirs) {
            const pageDirPath = slash(resolve(options.root, pageDir.dir))
            debug.gen('dir: %O', pageDirPath)

            const files = await getPageFiles(pageDirPath, options)
            debug.gen('files: %O', files)

            const routes = generateRoutes(files, pageDir, options)
            generatedRoutes.push(...routes)
          }
        }
        generatedRoutes = generatedRoutes.sort(i => isDynamicRoute(i.path) ? 1 : -1)
        const allRoute = generatedRoutes.find(i => isCatchAllRoute(i.path))
        if (allRoute) {
          generatedRoutes = generatedRoutes.filter(i => isCatchAllRoute(i.path))
          generatedRoutes.push(allRoute)
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
