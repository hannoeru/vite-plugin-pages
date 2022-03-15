import { resolve, win32 } from 'path'
import Debug from 'debug'
import { slash } from '@antfu/utils'
import { MODULE_ID_VIRTUAL, cacheAllRouteRE, countSlashRE, dynamicRouteRE, nuxtCacheAllRouteRE, nuxtDynamicRouteRE, pathToNameRE, replaceDynamicRouteRE, replaceIndexRE } from './constants'

import type { ViteDevServer } from 'vite'
import type { ResolvedOptions } from './types'

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
  return (value.match(countSlashRE) || []).length
}

function isPagesDir(path: string, options: ResolvedOptions) {
  for (const page of options.dirs) {
    const dirPath = slash(resolve(options.root, page.dir))
    if (path.startsWith(dirPath)) return true
  }
  return false
}

export function isTarget(path: string, options: ResolvedOptions) {
  return isPagesDir(path, options) && options.extensionsRE.test(path)
}

export function isDynamicRoute(routePath: string, nuxtStyle = false) {
  return nuxtStyle
    ? nuxtDynamicRouteRE.test(routePath)
    : dynamicRouteRE.test(routePath)
}

export function isCatchAllRoute(routePath: string, nuxtStyle = false) {
  return nuxtStyle
    ? nuxtCacheAllRouteRE.test(routePath)
    : cacheAllRouteRE.test(routePath)
}

export function resolveImportMode(
  filepath: string,
  options: ResolvedOptions,
) {
  const mode = options.importMode
  if (typeof mode === 'function')
    return mode(filepath, options)
  return mode
}

export function pathToName(filepath: string) {
  return filepath.replace(pathToNameRE[0], '_').replace(pathToNameRE[1], '$')
}

export function invalidatePagesModule(server: ViteDevServer) {
  const { moduleGraph } = server
  const module = moduleGraph.getModuleById(MODULE_ID_VIRTUAL)
  if (module) {
    moduleGraph.invalidateModule(module)
    return module
  }
}

export function normalizeCase(str: string, caseSensitive: boolean) {
  if (!caseSensitive) return str.toLocaleLowerCase()
  return str
}

export function normalizeName(name: string, isDynamic: boolean, nuxtStyle = false) {
  if (!isDynamic) return name

  return nuxtStyle
    ? name.replace(nuxtDynamicRouteRE, '$1') || 'all'
    : name.replace(replaceDynamicRouteRE, '$1')
}

export function buildReactRoutePath(node: string, nuxtStyle = false): string | undefined {
  const isDynamic = isDynamicRoute(node, nuxtStyle)
  const isCatchAll = isCatchAllRoute(node, nuxtStyle)
  const normalizedName = normalizeName(node, isDynamic, nuxtStyle)

  if (isDynamic) {
    if (isCatchAll)
      return '*'

    return `:${normalizedName}`
  }

  return `${normalizedName}`
}

// https://github.dev/remix-run/remix/blob/264e3f8884c5cafd8d06acc3e01153b376745b7c/packages/remix-dev/config/routesConvention.ts#L105
export function buildReactRemixRoutePath(node: string): string | undefined {
  const escapeStart = '['
  const escapeEnd = ']'
  let result = ''
  let rawSegmentBuffer = ''

  let inEscapeSequence = 0
  let skipSegment = false
  for (let i = 0; i < node.length; i++) {
    const char = node.charAt(i)
    const lastChar = i > 0 ? node.charAt(i - 1) : undefined
    const nextChar = i < node.length - 1 ? node.charAt(i + 1) : undefined

    function isNewEscapeSequence() {
      return (
        !inEscapeSequence && char === escapeStart && lastChar !== escapeStart
      )
    }

    function isCloseEscapeSequence() {
      return inEscapeSequence && char === escapeEnd && nextChar !== escapeEnd
    }

    function isStartOfLayoutSegment() {
      return char === '_' && nextChar === '_' && !rawSegmentBuffer
    }

    if (skipSegment) {
      if (char === '/' || char === '.' || char === win32.sep)
        skipSegment = false

      continue
    }

    if (isNewEscapeSequence()) {
      inEscapeSequence++
      continue
    }

    if (isCloseEscapeSequence()) {
      inEscapeSequence--
      continue
    }

    if (inEscapeSequence) {
      result += char
      continue
    }

    if (char === '/' || char === win32.sep || char === '.') {
      if (rawSegmentBuffer === 'index' && result.endsWith('index'))
        result = result.replace(replaceIndexRE, '')
      else result += '/'

      rawSegmentBuffer = ''
      continue
    }

    if (isStartOfLayoutSegment()) {
      skipSegment = true
      continue
    }

    rawSegmentBuffer += char

    if (char === '$') {
      result += typeof nextChar === 'undefined' ? '*' : ':'
      continue
    }

    result += char
  }

  if (rawSegmentBuffer === 'index' && result.endsWith('index'))
    result = result.replace(replaceIndexRE, '')

  return result || undefined
}
