import type EventEmitter from 'events'
import type { Logger } from 'vite'
import type { Awaitable } from '@antfu/utils'
import type { PageRoute } from './context'
import type Debug from 'debug'

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type ImportMode = 'sync' | 'async'
export type ImportModeResolver = (filepath: string, pluginOptions: ResolvedOptions) => ImportMode

export type CustomBlock = Record<string, any>

export enum SupportedPagesResolverEnum {
  vue = 'vue',
  react = 'react',
  solid = 'solid',
}

export interface PageOptions {
  dir: string
  baseRoute: string
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
   * Import routes directly or as async components
   * @default 'Internal Page Context'
   */
  pageContext: BasePageContext
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
   * Use routing style
   * @default false
   */
  routeStyle: 'next' | 'nuxt' | 'remix'
  /**
   * Use case for route paths
   * @default false
     */
  caseSensitive: boolean
  /**
   * Set the default route block parser, or use `<route lang=xxx>` in SFC route block
   * @default 'json5'
   */
  routeBlockLang: 'json5' | 'json' | 'yaml' | 'yml'
  /**
   * Generate React Route
   * @default 'auto detect'
   */
  resolver: PageResolver

  /**
   * import module resolver.
   * @summary If you are using our own supported pages resolver, this will be set for you, please read the documentation for the chosen framework
   * @default 'undefined'
   */
  moduleId?: string
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

export interface ResolvedOptions extends Omit<Options, 'pagesDir' | 'replaceSquareBrackets' | 'nuxtStyle' | 'syncIndex'> {
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
   * RegExp to match extensions
   */
  extensionsRE: RegExp
}

export interface ResolverConstructor {
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new(userOptions: UserOptions, viteRoot: string): Resolver
}
export interface Resolver {
  setLogger(logger: Logger): void
  setUserOptions(userOptions: UserOptions): void
  setViteInfo(viteRoot: string): void
  resolveRoutes(ctx: BasePageContext): Promise<string>
}

export interface BasePageContext {
  setLogger(logger: Logger): void
  setUserOptions(userOptions: UserOptions): void
  setViteInfo(viteRoot: string): void

  addPage(path: string | string[], pageDir: PageOptions): void | Promise<void>
  removePage(path: string | string[]): void
  checkCustomBlockChange(path: string): void | Promise<void>
  resolveRoutes(): Promise<string | undefined>
  onUpdate?(): void
  customBlockMap: Map<string, CustomBlock>
  pageRouteMap: Map<string, PageRoute>
  debug: Record<string, Debug.Debugger>
  events: EventEmitter
  options?: ResolvedOptions | UserOptions
}

export type SupportedPagesResolver = keyof typeof SupportedPagesResolverEnum

export type PageResolverFunc = (page: BasePageContext) => Promise<string>
export type PageResolver = SupportedPagesResolver | PageResolverFunc
