export type ImportMode = 'sync' | 'async'
export type ImportModeResolveFn = (filepath: string) => ImportMode

export type CustomBlock = Record<string, any>

export type PagesResolver = (pagePaths: Set<string>, routeBlocks: Map<string, CustomBlock>) => any

export type SupportedPagesResolver = 'vue' | 'react'

export interface PageOptions {
  dir: string
  baseRoute: string
}

/**
 * Plugin options.
 */
interface Options {
  /**
   * Relative path to the directory to search for page components.
   * @default 'src/pages'
   */
  pages: string | (string | PageOptions)[]
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
   * @default 'async'
   */
  importMode: ImportMode | ImportModeResolveFn
  /**
   * Sync load top level index file
   * @default true
   */
  syncIndex: boolean
  /**
   * Use Nuxt.js style route naming
   * @default false
   */
  nuxtStyle: boolean
  /**
   * Set the default route block parser, or use `<route lang=xxx>` in SFC route block
   * @default 'json5'
   */
  routeBlockLang: 'json5' | 'json' | 'yaml' | 'yml'
  /**
   * Replace '[]' to '_' in bundle chunk filename
   * Experimental feature
   * @default true
   */
  replaceSquareBrackets: boolean
  /**
   * Generate React Route
   * @default false
   */
  react: boolean
  /**
   * Extend route records
   */
  extendRoute?: (route: any, parent: any | undefined) => any | void
  /**
   * Custom generated routes
   */
  onRoutesGenerated?: (routes: any[]) => any[] | void | Promise<any[] | void>
  /**
   * Custom generated client code
   */
  onClientGenerated?: (clientCode: string) => string | void | Promise<string | void>
}

export type UserOptions = Partial<Options>

export interface ResolvedPage {
  dir: string
  route: string
  extension: string
  filepath: string
  component: string
  customBlock: Record<string, any> | null
}

export type ResolvedPages = Map<string, ResolvedPage>

export interface ResolvedOptions extends Options {
  /**
   * Resolves to the `root` value from Vite config.
   * @default config.root
   */
  root: string
  /**
   * RegExp to match extensions
   */
  extensionsRE: RegExp
  pages: PageOptions[]
}
