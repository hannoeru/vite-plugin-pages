import { resolve, win32 } from 'path'
import Debug from 'debug'
import { slash } from '@antfu/utils'
import { MODULE_ID_VIRTUAL } from './constants'

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
  return (value.match(/\//g) || []).length
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

  for (const page of options.dirs) {
    if (
      options.syncIndex
      && page.baseRoute === ''
      && filepath === `/${page.dir}/index.vue`
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

export function normalizeCase(str: string, caseSensitive: boolean) {
  if (!caseSensitive) return str.toLocaleLowerCase()
  return str
}

export function buildReactRoutePath(node: string): string | undefined {
  const isDynamic = isDynamicRoute(node, false)
  const isCatchAll = isCatchAllRoute(node, false)
  const normalizedName = isDynamic
    ? isCatchAll
      ? 'all'
      : node.replace(/^\[(\.{3})?/, '').replace(/\]$/, '')
    : node

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
        result = result.replace(/\/?index$/, '')
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
    result = result.replace(/\/?index$/, '')

  return result || undefined
}
