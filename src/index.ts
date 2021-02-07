import { resolve } from 'path'
import type { Plugin, ResolvedConfig, ModuleNode } from 'vite'
import { Route, ResolvedOptions, UserOptions } from './types'
import { getPagesPath } from './files'
import { generateRoutes, generateClientCodeFromRoutes, updateRouteFromContent } from './generate'
import { debug, normalizePath } from './utils'
import { parseVueRequest } from './query'

const ID = 'pages-generated'

function resolveOptions(userOptions: UserOptions): ResolvedOptions {
  const {
    pagesDir = 'src/pages',
    extensions = ['vue', 'js'],
    importMode = 'async',
    exclude = [],
    syncIndex = true,
  } = userOptions

  const root = process.cwd()
  const pagesDirPath = normalizePath(resolve(root, pagesDir))

  return Object.assign(
    {},
    {
      root,
      pagesDir,
      pagesDirPath,
      extensions,
      importMode,
      exclude,
      syncIndex,
    },
    userOptions,
  )
}

function routePlugin(userOptions: UserOptions = {}): Plugin {
  let config: ResolvedConfig | undefined
  let pagesDirPath: string
  let filesPath: string[]
  let generatedRoutes: Route[] | null

  const options: ResolvedOptions = resolveOptions(userOptions)

  return {
    name: 'vite-plugin-pages',
    enforce: 'pre',
    configResolved(_config) {
      config = _config
      options.root = config.root
      pagesDirPath = normalizePath(resolve(config.root, options.pagesDir))
      debug('pagesDirPath', pagesDirPath)
    },
    resolveId(id) {
      if (id === ID)
        return ID
    },
    async load(id) {
      if (id === ID) {
        debug('Loading...')

        filesPath = await getPagesPath(options)

        debug('filesPath: %O', filesPath)

        if (!generatedRoutes) {
          debug('Generating initial routes...')
          generatedRoutes = generateRoutes(filesPath, options)
          debug('generatedRoutes: %O', generatedRoutes)
        }

        const clientCode = generateClientCodeFromRoutes(generatedRoutes, options)

        debug('client code: %O', clientCode)

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
    async handleHotUpdate({ file, server, read }) {
      const extensionsRE = new RegExp(`\\.(${options.extensions.join('|')})$`)
      // Hot reload module when new file created
      debug('hmr: %O', file)
      if (
        file.startsWith(pagesDirPath)
        && extensionsRE.test(file)
      ) {
        let needReload = false
        // Need to regenerate routes on new file
        if (!filesPath.includes(file.replace(`${pagesDirPath}/`, ''))) {
          generatedRoutes = null
          needReload = true
        }
        else if (generatedRoutes) {
          // Otherwise, update existing routes
          const content = await read()
          needReload = updateRouteFromContent(content, file, generatedRoutes)
        }

        if (needReload) {
          const { moduleGraph } = server
          const module = moduleGraph.getModuleById(ID)

          return [module] as ModuleNode[]
        }
      }
    },
  }
}

export * from './types'
export default routePlugin
