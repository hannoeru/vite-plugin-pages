import type { TransformResult } from 'vite'
import type { ReactRoute, SolidRoute, VueRoute } from './resolvers'
import type { PageContext } from './context'
import type { Awaitable } from '@antfu/utils'

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type ImportMode = 'sync' | 'async'
export type ImportModeResolver = (filepath: string, pluginOptions: ResolvedOptions) => ImportMode

export interface ParsedJSX {
  value: string
  loc: {
    start: {
      line: number
    }
  }
}

export type CustomBlock = Record<string, any>

export type InternalPageResolvers = 'vue' | 'react' | 'solid'

export interface PageOptions {
  dir: string
  baseRoute: string
}

export interface PageResolver {
  resolveModuleIds: () => string[]
  resolveExtensions: () => string[]
  resolveRoutes: (ctx: PageContext) => Awaitable<string>
  getComputedRoutes: (ctx: PageContext) => Awaitable<VueRoute[] | ReactRoute[] | SolidRoute[]>
  stringify?: {
    dynamicImport?: (importPath: string) => string
    component?: (importName: string) => string
    final?: (code: string) => string
  }
  hmr?: {
    added?: (ctx: PageContext, path: string) => Awaitable<void>
    removed?: (ctx: PageContext, path: string) => Awaitable<void>
    changed?: (ctx: PageContext, path: string) => Awaitable<void>
  }
  transform?: (ctx: PageContext, code: string, id: string) => Awaitable<TransformResult | undefined>
}

/**
 * Plugin options.
 */
interface Options {
  /**
   * Paths to the directory to search for page components.
   * @default 'src/pages'
   */
  dirs: string | (string | PageOptions)[]
  /**
   * Valid file extensions for page components.
   * @default ['vue', 'js']
   */
  extensions: string[]
  /**
   * List of path globs to exclude when resolving pages.
   */
  exclude: string[]
  /**
   * Import routes directly or as async components
   * @default 'root index file => "sync", others => "async"'
   */
  importMode: ImportMode | ImportModeResolver
  /**
   * Sync load top level index file
   * @default true
   * @deprecated use `importMode` instead
   */
  syncIndex: boolean
  /**
   * Use Nuxt.js style route naming
   * @default false
   * @deprecated use `routeStyle` instead
   */
  nuxtStyle: boolean
  /**
   * Routing style
   * @default false
   */
  routeStyle: 'next' | 'nuxt' | 'remix'
  /**
   * Separator for generated route names.
   * @default -
   */
  routeNameSeparator: string
  /**
   * Case for route paths
   * @default false
     */
  caseSensitive: boolean
  /**
   * Set the default route block parser, or use `<route lang=xxx>` in SFC route block
   * @default 'json5'
   */
  routeBlockLang: 'json5' | 'json' | 'yaml' | 'yml'
  /**
   * Module id for routes import
   * @default '~pages'
   */
  moduleId: string
  /**
   * Generate React Route
   * @default 'auto detect'
   */
  resolver: InternalPageResolvers | PageResolver
  /**
   * Extend route records
   */
  extendRoute?: (route: any, parent: any | undefined) => any | void
  /**
   * Custom generated routes
   */
  onRoutesGenerated?: (routes: any[]) => Awaitable<any[] | void>
  /**
   * Custom generated client code
   */
  onClientGenerated?: (clientCode: string) => Awaitable<string | void>

  /**
   * Paths to the directory to search for page components.
   * @deprecated use `dirs` instead
   */
  pagesDir: string | (string | PageOptions)[]
  /**
   * Replace '[]' to '_' in bundle filename
   * @deprecated issue #122
   */
  replaceSquareBrackets: never
}

export type UserOptions = Partial<Options>

export interface ResolvedOptions extends Omit<Options, 'pagesDir' | 'replaceSquareBrackets' | 'nuxtStyle' | 'syncIndex' | 'moduleId'> {
  /**
   * Resolves to the `root` value from Vite config.
   * @default config.root
   */
  root: string
  /**
   * Resolved page dirs
   */
  dirs: PageOptions[]
  /**
   * Resolved page resolver
   */
  resolver: PageResolver
  /**
   * RegExp to match extensions
   */
  extensionsRE: RegExp
  /**
   * Module IDs for routes import
   */
  moduleIds: string[]
}

export interface VueRouteBase {
  name: string
  path: string
  props?: boolean
  component: string
  children?: VueRouteBase[]
  customBlock?: CustomBlock
  rawRoute: string
}
