import { resolve } from 'path'
import deepEqual from 'deep-equal'
import type { Plugin, ResolvedConfig, ModuleNode } from 'vite'
import { Route, ResolvedOptions, UserOptions } from './types'
import { getPagesPath } from './files'
import { generateRoutes, generateClientCode, generateClientCodeFromRoutes } from './generate'
import { debug, normalizePath } from './utils'
import { parseVueRequest } from './query'
import { tryParseCustomBlock, parseSFC } from './parseSfc'

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

  return Object.assign(
    {},
    {
      root,
      pagesDir,
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

  const findRouteByFilename = (routes: Route[], filename: string): Route | undefined => {
    let result = routes.find(x => x.filename === filename)
    if (result === undefined) {
      for (const route of routes) {
        if (route.children !== undefined) result = findRouteByFilename(route.children, filename)
        if (result) break
      }
    }
    return result
  }

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
      const { filename, query } = parseVueRequest(id)

      if (query && query.vue && query.lang === 'route') {
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
        else {
          // Otherwise, update existing routes
          const content = await read()
          const parsed = parseSFC(content)
          const routeBlock = parsed.customBlocks.find(b => b.type === 'route')
          if (generatedRoutes && routeBlock) {
            debug('hmr code: %O', routeBlock.content)
            const route = findRouteByFilename(generatedRoutes, file)

            if (route) {
              const before = Object.assign({}, route)
              Object.assign(route, tryParseCustomBlock(routeBlock.content, file, 'route'))
              needReload = !deepEqual(before, route)
            }
          }
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
