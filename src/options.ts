import { resolve } from 'path'
import { slash, toArray } from '@antfu/utils'
import { getPageDirs } from './files'

import type { ImportModeResolver, ResolvedOptions, UserOptions } from './types'

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

export const syncIndexResolver: ImportModeResolver = (filepath, options) => {
  for (const page of options.dirs) {
    if (page.baseRoute === '' && filepath.startsWith(`/${page.dir}/index`))
      return 'sync'
  }
  return 'async'
}

const getExtensions = (resolver: ResolvedOptions['resolver']) => {
  switch (resolver) {
  case 'vue':
    return ['vue', 'ts', 'js']
  case 'react':
  case 'solid':
    return ['tsx', 'jsx', 'ts', 'js']
  default:
    throw new Error(`Unsupported resolver: ${resolver}`)
  }
}

export function resolveOptions(userOptions: UserOptions, viteRoot?: string): ResolvedOptions {
  const {
    dirs = userOptions.pagesDir || ['src/pages'],
    routeBlockLang = 'json5',
    exclude = [],
    caseSensitive = false,
    resolver = 'vue',
    syncIndex = true,
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  } = userOptions

  const root = viteRoot || slash(process.cwd())

  const importMode = userOptions.importMode || (syncIndex ? syncIndexResolver : 'async')

  const extensions = userOptions.extensions || getExtensions(resolver)

  const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`)

  const resolvedDirs = resolvePageDirs(dirs, root, exclude)

  const routeStyle = userOptions.nuxtStyle ? 'nuxt' : userOptions.routeStyle || 'next'

  const resolvedOptions: ResolvedOptions = {
    dirs: resolvedDirs,
    routeStyle,
    routeBlockLang,
    root,
    extensions,
    importMode,
    exclude,
    caseSensitive,
    resolver,
    extensionsRE,
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  }

  return resolvedOptions
}
