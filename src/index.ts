import { resolve, basename } from 'path'
import type { Plugin, ResolvedConfig, ModuleNode } from 'vite'
import { Route, ResolvedOptions, UserOptions, PageDirOptions } from './types'
import { getFilesFromPath } from './files'
import { generateRoutes, generateClientCode, updateRouteFromHMR } from './generate'
import { debug, normalizePath } from './utils'
import { parseVueRequest } from './query'

const MODULE_IDS = ['pages-generated', 'virtual:generated-pages']
const MODULE_ID_VIRTUAL = '/@vite-plugin-pages/generated-pages'

export function resolveOptions(userOptions: UserOptions): ResolvedOptions {
  const {
    pagesDir = ['src/pages'],
    extensions = ['vue', 'js'],
    importMode = 'async',
    routeBlockLang = 'json5',
    exclude = [],
    syncIndex = true,
    replaceSquareBrackets = false,
    nuxtStyle = false,
  } = userOptions

  const root = process.cwd()

  let pagesDirOptions: PageDirOptions[] = []

  if (typeof pagesDir === 'string') {
    pagesDirOptions = pagesDirOptions.concat({ dir: pagesDir, baseRoute: '' })
  }
  else {
    for (const dir of pagesDir) {
      if (typeof dir === 'string')
        pagesDirOptions = pagesDirOptions.concat({ dir, baseRoute: '' })
      else if (dir as PageDirOptions)
        pagesDirOptions = pagesDirOptions.concat(dir)
    }
  }

  return Object.assign(
    {},
    {
      routeBlockLang,
      root,
      pagesDir,
      pagesDirOptions,
      extensions,
      importMode,
      exclude,
      syncIndex,
      replaceSquareBrackets,
      nuxtStyle,
    },
    userOptions,
  )
}

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
        debug('Loading...')
        debug('Loading Gen Routes: %O', generatedRoutes)

        if (!generatedRoutes) {
          generatedRoutes = []
          filesPath = []
          pagesDirPaths = []
          for (const pageDir of options.pagesDirOptions) {
            const pageDirPath = normalizePath(resolve(options.root, pageDir.dir))
            pagesDirPaths = pagesDirPaths.concat(pageDirPath)
            debug('Loading PageDir: %O', pageDirPath)

            const files = await getFilesFromPath(pageDirPath, options)
            filesPath = filesPath.concat(files.map(f => `${pageDirPath}/${f}`))
            debug('FilesPath: %O', files)

            const routes = generateRoutes(files, pageDir, options)
            generatedRoutes = generatedRoutes.concat(routes)
            // debug('Routes: %O', generatedRoutes)
          }
        }

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
      const extensionsRE = new RegExp(`\\.(${options.extensions.join('|')})$`)
      const matchedPath = (pagesDirPaths).find(p => file.startsWith(`${p}/`))
      // Handle pages HMR
      if (matchedPath && extensionsRE.test(file)) {
        let needReload = false

        // HMR on new file created
        // Otherwise, handle HMR from custom block
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

          debug('Reload for file: %s', file.replace(options.root, ''))

          return [module!]
        }
      }
    },
  }
}

export * from './types'
export default routePlugin
