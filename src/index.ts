import { resolve, basename } from 'path'
import type { Plugin, ResolvedConfig, ModuleNode } from 'vite'
import { Route, ResolvedOptions, UserOptions, PageDirOptions } from './types'
import { getFilesFromPath } from './files'
import { generateRoutes, generateClientCode, updateRouteFromHMR } from './generate'
import { debug, normalizePath } from './utils'
import { parseVueRequest } from './query'
import { resolveOptions } from './options'

const MODULE_IDS = ['pages-generated', 'virtual:generated-pages']
const MODULE_ID_VIRTUAL = '/@vite-plugin-pages/generated-pages'

function routePlugin(userOptions: UserOptions = {}): Plugin {
  let config: ResolvedConfig | undefined
  let filesPath: string[] = []
  let generatedRoutes: Route[] | null | undefined
  let pagesDirPaths: string[] = []

  const options: ResolvedOptions = resolveOptions(userOptions)

  return {
    name: 'vite-plugin-pages',
    enforce: 'pre',
    configResolved(_config) {
      config = _config
      options.root = config.root
    },
    resolveId(id) {
      return MODULE_IDS.includes(id) || MODULE_IDS.some(i => id.startsWith(i))
        ? MODULE_ID_VIRTUAL
        : null
    },
    async load(id) {
      if (id === MODULE_ID_VIRTUAL) {
        if (!generatedRoutes) {
          generatedRoutes = []
          filesPath = []
          pagesDirPaths = []
          for (const pageDir of options.pagesDirOptions) {
            const pageDirPath = normalizePath(resolve(options.root, pageDir.dir))
            pagesDirPaths = pagesDirPaths.concat(pageDirPath)
            debug.gen('dir: %O', pageDirPath)

            const files = await getFilesFromPath(pageDirPath, options)
            filesPath = filesPath.concat(files.map(f => `${pageDirPath}/${f}`))
            debug.gen('files: %O', files)

            const routes = generateRoutes(files, pageDir, options)
            generatedRoutes = generatedRoutes.concat(routes)
          }
        }
        debug.gen('routes: %O', generatedRoutes)

        const clientCode = generateClientCode(generatedRoutes, options)
        // debug.gen('client code: %O', clientCode)

        return clientCode
      }
    },
    async transform(code: string, id: string) {
      const { query } = parseVueRequest(id)

      if (query && query.vue && query.type === 'route') {
        return {
          code: 'export default {}',
          map: null,
        }
      }

      return {
        code,
        map: null,
      }
    },
    generateBundle(_options, bundle) {
      if (options.replaceSquareBrackets) {
        const files = Object.keys(bundle).map(i => basename(i))
        for (const name in bundle) {
          const chunk = bundle[name]
          chunk.fileName = chunk.fileName.replace(/(\[|\])/g, '_')
          if (chunk.type === 'chunk') {
            for (const file of files)
              chunk.code = chunk.code.replace(file, file.replace(/(\[|\])/g, '_'))
          }
        }
      }
    },
    async handleHotUpdate({ file, server, read }) {
      const isPagesDir = pagesDirPaths.find(p => file.startsWith(`${p}/`))
      // Handle pages HMR
      if (isPagesDir && options.extensionsRE.test(file)) {
        let needReload = false

        // Handle new file
        if (!filesPath.includes(file)) {
          generatedRoutes = null
          needReload = true
        }
        else if (generatedRoutes) {
          const content = await read()
          needReload = updateRouteFromHMR(content, file, generatedRoutes, options)
        }

        if (needReload) {
          const { moduleGraph } = server
          const module = moduleGraph.getModuleById(MODULE_ID_VIRTUAL)
          if (module)
            server.moduleGraph.invalidateModule(module)

          debug.hmr('hmr update: %s', file.replace(options.root, ''))

          return [module!]
        }
      }
    },
  }
}

export * from './types'
export default routePlugin
