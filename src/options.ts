import { resolve } from 'path'
import { UserOptions, ResolvedOptions } from './types'
import { getPageDirs } from './files'
import { toArray, slash } from './utils'

function resolvePageDirs(pagesDir: UserOptions['pagesDir'], root: string, exclude: string[]) {
  pagesDir = toArray(pagesDir)
  return pagesDir.flatMap((pagesDir) => {
    const option = typeof pagesDir === 'string'
      ? { dir: pagesDir, baseRoute: '' }
      : pagesDir

    option.dir = slash(resolve(root, option.dir)).replace(`${root}/`, '')
    option.baseRoute = option.baseRoute.replace(/^\//, '').replace(/\/$/, '')

    return getPageDirs(option, root, exclude)
  })
}

export function resolveOptions(userOptions: UserOptions, viteRoot?: string): ResolvedOptions {
  const {
    pagesDir = ['src/pages'],
    routeBlockLang = 'json5',
    exclude = [],
    syncIndex = true,
    replaceSquareBrackets = false,
    nuxtStyle = false,
    react = false,
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  } = userOptions

  const root = viteRoot || slash(process.cwd())

  const importMode = userOptions.importMode || (react ? 'sync' : 'async')

  const extensions = userOptions.extensions || (react ? ['tsx', 'jsx'] : ['vue', 'ts', 'js'])

  const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`)

  const resolvedPagesDir = resolvePageDirs(pagesDir, root, exclude)

  const resolvedOptions: ResolvedOptions = {
    pagesDir: resolvedPagesDir,
    routeBlockLang,
    root,
    extensions,
    importMode,
    exclude,
    syncIndex,
    replaceSquareBrackets,
    nuxtStyle,
    react,
    extensionsRE,
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  }

  return resolvedOptions
}
