import { resolve } from 'path'
import type { Plugin, ResolvedConfig, ModuleNode } from 'vite'
import { Route, ResolvedOptions, UserOptions } from './types'
import { getPagesPath } from './files'
import { generateRoutes, generateClientCode, updateRouteFromHMR } from './generate'
import { debug, normalizePath } from './utils'
import { parseVueRequest } from './query'

const ID = 'pages-generated'

function resolveOptions(userOptions: UserOptions): ResolvedOptions {
  const {
    pagesDir = 'src/pages',
    extensions = ['vue', 'js'],
    importMode = 'async',
    routeBlockLang = 'json5',
    exclude = [],
    syncIndex = true,
  } = userOptions

  const root = process.cwd()
  const pagesDirPath = normalizePath(resolve(root, pagesDir))

  return Object.assign(
    {},
    {
      routeBlockLang,
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
  let filesPath: string[] = []
  let generatedRoutes: Route[] | null | undefined

  const options: ResolvedOptions = resolveOptions(userOptions)

  return {
    name: 'vite-plugin-pages',
    enforce: 'pre',
    configResolved(_config) {
      config = _config
      options.root = config.root
      options.pagesDirPath = normalizePath(resolve(config.root, options.pagesDir))
      debug('pagesDirPath', options.pagesDirPath)
    },
    resolveId(id) {
      if (id === ID)
        return ID
    },
    async load(id) {
      if (id === ID) {
        debug('Loading files...')

        filesPath = await getPagesPath(options)

        debug('FilesPath: %O', filesPath)

        if (!generatedRoutes)
          generatedRoutes = generateRoutes(filesPath, options)

        debug('Routes: %O', generatedRoutes)

        const clientCode = generateClientCode(generatedRoutes, options)

        // debug('Client code: %O', clientCode)

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
      const pagesDirPath = options.pagesDirPath
      // Handle pages HMR
      if (
        file.startsWith(pagesDirPath)
        && extensionsRE.test(file)
      ) {
        let needReload = false

        // HMR on new file created
        // Otherwise, handle HMR from custom block
        if (!filesPath.includes(file.replace(`${pagesDirPath}/`, ''))) {
          generatedRoutes = null
          needReload = true
        }
        else if (generatedRoutes) {
          const content = await read()
          needReload = updateRouteFromHMR(content, file, generatedRoutes, options)
        }

        if (needReload) {
          const { moduleGraph } = server
          const module = moduleGraph.getModuleById(ID)

          debug('Reload for file: %s', file.replace(options.root, ''))

          return [module] as ModuleNode[]
        }
      }
    },
  }
}

export * from './types'
export default routePlugin
