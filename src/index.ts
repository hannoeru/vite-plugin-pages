import { resolve } from 'path'
import type { Plugin, ResolvedConfig, ModuleNode } from 'vite'
import { Options, UserOptions } from './types'
import { getPagesPath } from './files'
import { generateClientCode } from './generate'
import { debug, normalizePath } from './utils'

const ID = 'vite-plugin-pages/client'

function resolveOptions(userOptions: UserOptions): Options {
  const {
    pagesDir = 'src/pages',
    extensions = ['vue', 'js'],
    importMode = 'async',
    exclude = [],
    syncIndex = true,
  } = userOptions

  return Object.assign(
    {},
    {
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

  const options: Options = resolveOptions(userOptions)

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
      return id === ID ? ID : null
    },
    async load(id) {
      if (id !== ID)
        return null

      debug('Generating routes...')

      filesPath = await getPagesPath(options)

      debug('filesPath: %O', filesPath)

      const clientCode = generateClientCode(filesPath, options)

      debug('client code: %O', clientCode)

      return clientCode
    },
    async handleHotUpdate({ file, server }) {
      const extensionsRE = new RegExp(`\\.(${options.extensions.join('|')})$`)
      // Hot reload module when new file created
      if (
        file.startsWith(pagesDirPath)
        && !filesPath.includes(file.replace(`${pagesDirPath}/`, ''))
        && extensionsRE.test(file)
      ) {
        const { moduleGraph } = server
        const module = moduleGraph.getModuleById(ID)

        return [module] as ModuleNode[]
      }
      return []
    },
  }
}

export * from './types'
export default routePlugin
