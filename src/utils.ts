import Debug from 'debug'
import { ResolvedOptions } from './types'

export function extensionsToGlob(extensions: string[]) {
  return extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0] || ''
}

export function normalizePath(str: string): string {
  return str.replace(/\\/g, '/')
}

export const debug = Debug('vite-plugin-pages')

const dynamicRouteRE = /^\[.+\]$/

export function isDynamicRoute(routePath: string) {
  return dynamicRouteRE.test(routePath)
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
