/**
 * https://github.com/brattonross/vite-plugin-voie/blob/main/packages/vite-plugin-voie/src/options.ts
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file at
 * https://github.com/brattonross/vite-plugin-voie/blob/main/LICENSE
 */

export type ImportMode = 'sync' | 'async'
export type ImportModeResolveFn = (filepath: string) => ImportMode

export interface Route {
  name?: string
  path: string
  props?: boolean
  component: string
  children?: Route[]
  meta?: Record<string, unknown>
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
  pagesDir: string | string[] | PageDirOptions[]
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
  routeBlockLang: 'json5' | 'json' | 'yaml'
  /**
   * Replace '[]' to '_' in bundle chunk filename
   * Experimental feature
   * @default true
   */
  replaceSquareBrackets: boolean
  /**
   * Extend route records
   */
  extendRoute?: (route: Route, parent: Route | undefined) => Route | void
}

export type UserOptions = Partial<Options>

export interface ResolvedOptions extends Options {
  /**
   * Resolves to the `root` value from Vite config.
   * @default config.root
   */
  root: string
  /**
   * Page Dir as a normalized array of PageDirOptions
   */
  pagesDirOptions: PageDirOptions[]
  /**
   * RegExp to match extensions
   */
  extensionsRE: RegExp
}
