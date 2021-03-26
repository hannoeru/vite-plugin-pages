import Debug from 'debug'
import { ResolvedOptions, Route } from './types'

export function extensionsToGlob(extensions: string[]) {
  return extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0] || ''
}

export function normalizePath(str: string): string {
  return str.replace(/\\/g, '/')
}

export const debug = {
  hmr: Debug('vite-plugin-pages:hmr'),
  gen: Debug('vite-plugin-pages:gen'),
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
  if (options.syncIndex && filepath === `/${options.pagesDir}/index.vue`)
    return 'sync'
  else
    return mode
}

export function pathToName(filepath: string) {
  return filepath.replace(/[_.\-\\/]/g, '_').replace(/[[:\]()]/g, '$')
}

export function findRouteByFilename(routes: Route[], filename: string): Route | null {
  let result = null
  for (const route of routes) {
    if (filename.endsWith(route.component))
      result = route

    if (!result && route.children)
      result = findRouteByFilename(route.children, filename)

    if (result) return result
  }
  return null
}
