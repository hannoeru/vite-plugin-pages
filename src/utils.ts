import { resolve, win32 } from 'path'
import { URLSearchParams } from 'url'
import Debug from 'debug'
import { slash } from '@antfu/utils'
import { MODULE_ID_VIRTUAL, cacheAllRouteRE, countSlashRE, dynamicRouteRE, nuxt3CatchAllRouteRE, nuxt3DynamicRouteORE, nuxt3DynamicRouteRE, nuxtCacheAllRouteRE, nuxtDynamicRouteRE, replaceDynamicRouteRE, replaceIndexRE } from './constants'

import type { ModuleNode, ViteDevServer } from 'vite'
import type { ResolvedOptions, RouteStyle } from './types'

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

export function isDynamicRoute(routePath: string, routeStyle: RouteStyle) {
  switch (routeStyle) {
    case 'nuxt3': return (routePath).match(nuxt3DynamicRouteRE) !== null
    case 'nuxt': return nuxtDynamicRouteRE.test(routePath)
    default: return dynamicRouteRE.test(routePath)
  }
}

export function isCatchAllRoute(routePath: string, routeStyle: RouteStyle) {
  switch (routeStyle) {
    case 'nuxt3': return (routePath).match(nuxt3CatchAllRouteRE) !== null
    case 'nuxt': return nuxtCacheAllRouteRE.test(routePath)
    default: return cacheAllRouteRE.test(routePath)
  }
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

export function invalidatePagesModule(server: ViteDevServer) {
  const { moduleGraph } = server
  const mods = moduleGraph.getModulesByFile(MODULE_ID_VIRTUAL)
  if (mods) {
    const seen = new Set<ModuleNode>()
    mods.forEach((mod) => {
      moduleGraph.invalidateModule(mod, seen)
    })
  }
}

export function normalizeCase(str: string, caseSensitive: boolean) {
  if (!caseSensitive) return str.toLocaleLowerCase()
  return str
}

export function normalizeName(name: string, isDynamic: boolean, routeStyle: RouteStyle) {
  if (!isDynamic) return name

  switch (routeStyle) {
    case 'nuxt3': return name.replace(nuxt3DynamicRouteRE, (_, $1, $2) => {
      const value = ($2 || $1)

      if (value.startsWith('...')) return `:${value.slice(3)}`

      return `:${value}`
    })
    case 'nuxt':return name.replace(nuxtDynamicRouteRE, '$1') || 'all'
    default: return name.replace(replaceDynamicRouteRE, '$1')
  }
}

export function isNuxt3PathOptional(name: string) {
  return (name).match(nuxt3DynamicRouteORE) !== null
}

export function buildReactRoutePath(node: string, routeStyle: RouteStyle): string | undefined {
  const isDynamic = isDynamicRoute(node, routeStyle)
  const isCatchAll = isCatchAllRoute(node, routeStyle)
  const normalizedName = normalizeName(node, isDynamic, routeStyle)

  if (isDynamic) {
    if (isCatchAll)
      return '*'

    return `${routeStyle === 'nuxt3' ? '' : ':'}${normalizedName}`
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

export function parsePageRequest(id: string) {
  const [moduleId, rawQuery] = id.split('?', 2)
  const query = new URLSearchParams(rawQuery)
  const pageId = query.get('id')
  return {
    moduleId,
    query,
    pageId,
  }
}
