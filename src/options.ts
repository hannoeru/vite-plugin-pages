import { resolve } from 'path'
import { slash, toArray } from '@antfu/utils'
import { getPageDirs } from './files'

import { reactResolver, solidResolver, vueResolver } from './resolvers'
import { MODULE_IDS } from './constants'
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

const getResolver = (originalResolver: UserOptions['resolver']) => {
  let resolver = originalResolver || 'vue'

  if (typeof resolver !== 'string')
    return resolver

  switch (resolver) {
    case 'vue':
      resolver = vueResolver()
      break
    case 'react':
      resolver = reactResolver()
      break
    case 'solid':
      resolver = solidResolver()
      break
    default:
      throw new Error(`Unsupported resolver: ${resolver}`)
  }
  return resolver
}

export function resolveOptions(userOptions: UserOptions, viteRoot?: string): ResolvedOptions {
  const {
    dirs = userOptions.pagesDir || ['src/pages'],
    routeBlockLang = 'json5',
    exclude = ['node_modules', '.git', '**/__*__/**'],
    caseSensitive = false,
    syncIndex = true,
    routeNameSeparator = '-',
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  } = userOptions

  const root = viteRoot || slash(process.cwd())

  const importMode = userOptions.importMode || (syncIndex ? syncIndexResolver : 'async')

  const resolver = getResolver(userOptions.resolver)

  const extensions = userOptions.extensions || resolver.resolveExtensions()

  const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`)

  const resolvedDirs = resolvePageDirs(dirs, root, exclude)

  const routeStyle = userOptions.nuxtStyle ? 'nuxt' : userOptions.routeStyle || 'next'

  const moduleIds = userOptions.moduleId
    ? [userOptions.moduleId]
    : resolver.resolveModuleIds?.() || MODULE_IDS

  const resolvedOptions: ResolvedOptions = {
    dirs: resolvedDirs,
    routeStyle,
    routeBlockLang,
    moduleIds,
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
    routeNameSeparator,
  }

  return resolvedOptions
}
