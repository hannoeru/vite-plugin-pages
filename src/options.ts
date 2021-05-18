import { UserOptions, ResolvedOptions, PageDirOptions } from './types'
import { getPageDirs } from './files'

function resolvePagesDirs(pagesDirs: string | (string | PageDirOptions)[], exclude: string[]) {
  if (!Array.isArray(pagesDirs))
    pagesDirs = [pagesDirs]

  return pagesDirs.flatMap((pagesDir) => {
    const option: PageDirOptions = typeof pagesDir === 'string'
      ? { dir: pagesDir, baseRoute: '' }
      : pagesDir

    return getPageDirs(option, exclude)
  })
}

export function resolveOptions(userOptions: UserOptions): ResolvedOptions {
  const {
    pagesDir = ['src/pages'],
    extensions = ['vue', 'js'],
    routeBlockLang = 'json5',
    exclude = [],
    syncIndex = true,
    replaceSquareBrackets = false,
    nuxtStyle = false,
    react = false,
  } = userOptions

  const root = process.cwd()
  const importMode = react ? 'sync' : 'async'
  const pagesDirOptions = resolvePagesDirs(pagesDir, exclude)
  const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`)

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
      react,
      extensionsRE,
    },
    userOptions,
  )
}
