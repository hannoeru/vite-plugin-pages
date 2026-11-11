import type { ImportModeResolver, PageOptions, ResolvedOptions, UserOptions } from './types'
import { posix, resolve } from 'node:path'
import process from 'node:process'
import { slash, toArray } from '@antfu/utils'

import { MODULE_IDS } from './constants'
import { getPageDirs } from './files'
import { reactResolver, solidResolver, vueResolver } from './resolvers'
import { removePageExtension } from './utils'

export function normalizePageDirs(dirs: UserOptions['dirs'] = 'src/pages', root: string): PageOptions[] {
  return toArray(dirs).map((dir) => {
    const option = typeof dir === 'string'
      ? { dir }
      : dir

    return {
      ...option,
      dir: slash(resolve(root, option.dir)).replace(`${root}/`, ''),
      baseRoute: (option.baseRoute ?? '').replace(/^\//, '').replace(/\/$/, ''),
    }
  })
}

export function expandPageDirs(patterns: PageOptions[], root: string) {
  return patterns.flatMap(pattern => getPageDirs(pattern, root))
}

export const syncIndexResolver: ImportModeResolver = (filepath, options) => {
  const stem = removePageExtension(filepath, options.extensions)
  return options.dirs.some(({ dir, baseRoute }) => baseRoute === ''
    && (stem === `/${dir}/index` || stem === `${options.root}/${dir}/index`))
    ? 'sync'
    : 'async'
}

function getResolver(originalResolver: UserOptions['resolver']) {
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
    routeBlockLang = 'json5',
    exclude = ['**/node_modules/**', '**/.git/**', '**/__*__/**'],
    caseSensitive = false,
    routeNameSeparator = '-',
    extendRoute,
    onRoutesGenerated,
    onClientGenerated,
  } = userOptions

  const root = viteRoot || slash(process.cwd())

  const importMode = userOptions.importMode || syncIndexResolver

  const importPath = userOptions.importPath || 'relative'

  const resolver = getResolver(userOptions.resolver)

  const extensions = userOptions.extensions || resolver.resolveExtensions()

  const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`)

  if (exclude.some(pattern => posix.isAbsolute(pattern) || /^(?:[a-z]:[\\/]|\\\\)/i.test(pattern)))
    throw new Error('exclude patterns must be relative to each page directory.')

  const resolvedDirs = expandPageDirs(normalizePageDirs(userOptions.dirs, root), root)

  const routeStyle = userOptions.routeStyle || 'next'

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
    importPath,
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
