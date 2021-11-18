import { resolve, basename } from 'path'
import Debug from 'debug'
import { ViteDevServer } from 'vite'
import { slash } from '@antfu/utils'
import { ResolvedOptions } from './types'
import { MODULE_ID_VIRTUAL } from './constants'
import type { OutputBundle } from 'rollup'

export const debug = {
  hmr: Debug('vite-plugin-pages:hmr'),
  routeBlock: Debug('vite-plugin-pages:routeBlock'),
  options: Debug('vite-plugin-pages:options'),
  pages: Debug('vite-plugin-pages:pages'),
  search: Debug('vite-plugin-pages:search'),
  env: Debug('vite-plugin-pages:env'),
  cache: Debug('vite-plugin-pages:cache'),
  resolver: Debug('vite-plugin-pages:resolver'),
}

export function extsToGlob(extensions: string[]) {
  return extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0] || ''
}

export function countSlash(value: string) {
  return (value.match(/\//g) || []).length
}

function isPagesDir(path: string, options: ResolvedOptions) {
  for (const page of options.pages) {
    const dirPath = slash(resolve(options.root, page.dir))
    if (path.startsWith(dirPath)) return true
  }
  return false
}

export function isTarget(path: string, options: ResolvedOptions) {
  return isPagesDir(path, options) && options.extensionsRE.test(path)
}

const dynamicRouteRE = /^\[.+\]$/
export const nuxtDynamicRouteRE = /^_[\s\S]*$/

export function isDynamicRoute(routePath: string, nuxtStyle: Boolean = false) {
  return nuxtStyle
    ? nuxtDynamicRouteRE.test(routePath)
    : dynamicRouteRE.test(routePath)
}

export function isCatchAllRoute(routePath: string, nuxtStyle: Boolean = false) {
  return nuxtStyle
    ? /^_$/.test(routePath)
    : /^\[\.{3}/.test(routePath)
}

export function resolveImportMode(
  filepath: string,
  options: ResolvedOptions,
) {
  const mode = options.importMode
  if (typeof mode === 'function')
    return mode(filepath)

  for (const pageDir of options.pages) {
    if (
      options.syncIndex
      && pageDir.baseRoute === ''
      && filepath === `/${pageDir.dir}/index.vue`
    )
      return 'sync'
  }
  return mode
}

export function pathToName(filepath: string) {
  return filepath.replace(/[_.\-\\/]/g, '_').replace(/[[:\]()]/g, '$')
}

export function invalidatePagesModule(server: ViteDevServer) {
  const { moduleGraph } = server
  const module = moduleGraph.getModuleById(MODULE_ID_VIRTUAL)
  if (module) {
    moduleGraph.invalidateModule(module)
    return module
  }
}

export function replaceSquareBrackets(bundle: OutputBundle) {
  const files = Object.keys(bundle).map(i => basename(i))
  for (const chunk of Object.values(bundle)) {
    chunk.fileName = chunk.fileName.replace(/(\[|\])/g, '_')
    if (chunk.type === 'chunk') {
      for (const file of files)
        chunk.code = chunk.code.replace(file, file.replace(/(\[|\])/g, '_'))
    }
  }
}

export function sortByDynamicRoute(routes: any[]) {
  return routes.sort((a, b) => {
    if (a.path?.includes(':') && b.path?.includes(':'))
      return b.path > a.path ? 1 : -1
    else if (a.path?.includes(':') || b.path?.includes(':'))
      return a.path?.includes(':') ? 1 : -1
    else
      return b.path > a.path ? 1 : -1
  })
}
