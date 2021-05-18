import { UserOptions, ResolvedOptions, PageDirOptions } from './types'
import { getPageDirs } from './files'

function resolvePagesDirs(pagesDirs: string | (string | PageDirOptions)[], root: string, exclude: string[]) {
  if (!Array.isArray(pagesDirs))
    pagesDirs = [pagesDirs]

  return pagesDirs.flatMap((pagesDir) => {
    const option: PageDirOptions = typeof pagesDir === 'string'
      ? { dir: pagesDir, baseRoute: '' }
      : pagesDir

    return getPageDirs(option, root, exclude)
  })
}

export function resolveOptions(userOptions: UserOptions, root: string = process.cwd()): ResolvedOptions {
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

  const importMode = react ? 'sync' : 'async'
  const pagesDirOptions = resolvePagesDirs(pagesDir, root, exclude)
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
