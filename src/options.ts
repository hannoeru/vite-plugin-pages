import { resolve } from 'path'
import { slash, toArray } from '@antfu/utils'
import { getPageDirs } from './files'

import type { ResolvedOptions, UserOptions } from './types'

function resolvePageDirs(dirs: UserOptions['dirs'], root: string, exclude: string[]) {
  dirs = toArray(dirs)
  return dirs.flatMap((dirPath) => {
    const option = typeof dirPath === 'string'
      ? { dir: dirPath, baseRoute: '' }
      : dirPath

    option.dir = slash(resolve(root, option.dir)).replace(`${root}/`, '')
    option.baseRoute = option.baseRoute.replace(/^\//, '').replace(/\/$/, '')

    return getPageDirs(option, root, exclude)
  })
}

export function resolveOptions(userOptions: UserOptions, viteRoot?: string): ResolvedOptions {
  const {
    dirs = userOptions.pagesDir || ['src/pages'],
    routeBlockLang = 'json5',
    exclude = [],
    syncIndex = true,
    remixStyle = false,
    nuxtStyle = false,
    caseSensitive = false,
    resolver = 'vue',
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  } = userOptions

  const root = viteRoot || slash(process.cwd())

  const importMode = userOptions.importMode || (resolver === 'react' ? 'sync' : 'async')

  const extensions = userOptions.extensions || (resolver === 'react' ? ['tsx', 'jsx'] : ['vue', 'ts', 'js'])

  const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`)

  const resolvedDirs = resolvePageDirs(dirs, root, exclude)

  const resolvedOptions: ResolvedOptions = {
    dirs: resolvedDirs,
    routeBlockLang,
    root,
    extensions,
    importMode,
    exclude,
    syncIndex,
    remixStyle,
    nuxtStyle,
    caseSensitive,
    resolver,
    extensionsRE,
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  }

  return resolvedOptions
}
