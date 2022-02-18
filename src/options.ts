import { resolve } from 'path'
import { slash, toArray } from '@antfu/utils'
import { getPageDirs } from './files'

import type { ResolvedOptions, UserOptions } from './types'

function resolvePageDirs(dirs: UserOptions['dirs'], root: string, exclude: string[]) {
  dirs = toArray(dirs)
  return dirs.flatMap((dir) => {
    const option = typeof dir === 'string'
      ? { dir, baseRoute: '' }
      : dir

    option.dir = slash(resolve(root, option.dir)).replace(`${root}/`, '')
    option.baseRoute = option.baseRoute.replace(/^\//, '').replace(/\/$/, '')

    return getPageDirs(option, root, exclude)
  })
}

export function resolveOptions(userOptions: UserOptions, viteRoot?: string): ResolvedOptions {
  const {
    dirs = userOptions.pagesDir || ['src/pages'],
    routeStyle = 'next',
    routeBlockLang = 'json5',
    exclude = [],
    syncIndex = true,
    caseSensitive = false,
    resolver = 'vue',
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  } = userOptions

  const root = viteRoot || slash(process.cwd())

  // TODO: default import mode for solid
  const importMode = userOptions.importMode || (resolver === 'react' ? 'sync' : 'async')

  const extensions = userOptions.extensions || (resolver === 'react' ? ['tsx', 'jsx'] : resolver === 'solid' ? ['tsx', 'jsx', 'ts', 'js'] : ['vue', 'ts', 'js'])

  const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`)

  const resolvedDirs = resolvePageDirs(dirs, root, exclude)

  const resolvedOptions: ResolvedOptions = {
    dirs: resolvedDirs,
    routeStyle,
    routeBlockLang,
    root,
    extensions,
    importMode,
    exclude,
    syncIndex,
    caseSensitive,
    resolver,
    extensionsRE,
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  }

  return resolvedOptions
}
