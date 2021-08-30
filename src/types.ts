export type ImportMode = 'sync' | 'async'
export type ImportModeResolveFn = (filepath: string) => ImportMode

export interface Route {
  name?: string
  path: string
  props?: boolean | Record<string, any> | ((to: any) => Record<string, any>)
  component: string
  children?: Route[]
  routes?: Route[]
  exact?: boolean
  meta?: Record<string, unknown>
  customBlock?: Record<string, any> | null
  beforeEnter?: any
}
export interface PageDirOptions {
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
  pagesDir: string | (string | PageDirOptions)[]
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
   * Use Nuxt.js style dynamic routing
   * @default false
   */
  nuxtStyle: boolean
  /**
   * Set default route block parser, or use `<route lang=xxx>` in SFC route block
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
  extendRoute?: (route: Route, parent: Route | undefined) => Route | void
  /**
   * Custom generated routes
   */
  onRoutesGenerated?: (routes: Route[]) => Route[] | void | Promise<Route[] | void>
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
  pagesDir: PageDirOptions[]
}
