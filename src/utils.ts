import fs from 'fs'
import { resolve, basename } from 'path'
import Debug from 'debug'
import { ViteDevServer } from 'vite'
import { OutputBundle } from 'rollup'
import { ResolvedOptions, Route } from './types'
import { parseSFC, parseCustomBlock } from './parser'
import { MODULE_ID_VIRTUAL } from './constants'

export function extensionsToGlob(extensions: string[]) {
  return extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0] || ''
}

function isPagesDir(path: string, options: ResolvedOptions) {
  for (const page of options.pagesDirOptions) {
    const dirPath = slash(resolve(options.root, page.dir))
    if (path.startsWith(dirPath)) return true
  }
  return false
}

export function isTarget(path: string, options: ResolvedOptions) {
  return isPagesDir(path, options) && options.extensionsRE.test(path)
}

export function slash(str: string): string {
  return str.replace(/\\/g, '/')
}

export const debug = {
  hmr: Debug('vite-plugin-pages:hmr'),
  sfc: Debug('vite-plugin-pages:sfc'),
  gen: Debug('vite-plugin-pages:gen'),
  options: Debug('vite-plugin-pages:options'),
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

export function getRouteBlock(path: string, options: ResolvedOptions) {
  const content = fs.readFileSync(path, 'utf8')
  const parsed = parseSFC(content)
  const blockStr = parsed.customBlocks.find(b => b.type === 'route')
  if (!blockStr) return null
  const result: Record<string, any> = parseCustomBlock(blockStr, path, options)
  return result
}

export function getPagesVirtualModule(server: ViteDevServer) {
  const { moduleGraph } = server
  const module = moduleGraph.getModuleById(MODULE_ID_VIRTUAL)
  if (module) {
    moduleGraph.invalidateModule(module)
    return module
  }
  return null
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
