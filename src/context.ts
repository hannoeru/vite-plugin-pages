import { extname, join, resolve } from 'path'
import EventEmitter from 'events'
import deepEqual from 'deep-equal'
import { slash, toArray } from '@antfu/utils'
import colors from 'picocolors'
import { resolveOptions } from './options'
import { debug, isPageResolverFunc } from './utils'
import { resolveReactRoutes } from './resolvers/react'
import { resolveVueRoutes } from './resolvers/vue'
import { resolveSolidRoutes } from './resolvers/solid'
import { getRouteBlock } from './customBlock'

import type { Logger } from 'vite'
import type { BasePageContext, CustomBlock, PageOptions, ResolvedOptions, UserOptions } from './types'

export interface PageRoute {
  path: string
  route: string
}

export class PageContext implements BasePageContext {
  private _pageRouteMap = new Map<string, PageRoute>()
  private _customBlockMap: Map<string, CustomBlock> = new Map()
  private _eventEmitter = new EventEmitter()

  private root?: string
  private logger?: Logger
  options!: ResolvedOptions

  setUserOptions(userOptions: UserOptions) {
    this.options = resolveOptions(userOptions, this.root)
    debug.options(this.options)
  }

  setViteInfo(viteRoot: string) {
    this.root = slash(viteRoot)
    debug.env('root', this.root)
  }

  setLogger(logger: Logger) {
    this.logger = logger
  }

  async addPage(path: string | string[], pageDir: PageOptions) {
    debug.pages('add', path)
    for (const p of toArray(path)) {
      const pageDirPath = slash(resolve(this.root ?? '', pageDir.dir))
      const route = slash(join(pageDir.baseRoute, p.replace(`${pageDirPath}/`, '').replace(extname(p), '')))
      this._pageRouteMap.set(p, {
        path: p,
        route,
      })
      await this.checkCustomBlockChange(p)
    }
  }

  removePage(path: string | string[]) {
    debug.pages('remove', path)
    toArray(path).forEach((p) => {
      this._pageRouteMap.delete(p)
      this._customBlockMap.delete(p)
    })
  }

  async checkCustomBlockChange(path: string) {
    if (this.options?.resolver !== 'vue')
      return

    const exitsCustomBlock = this._customBlockMap.get(path)
    let customBlock: CustomBlock | undefined
    try {
      customBlock = await getRouteBlock(path, this.options)
    } catch (error: any) {
      // eslint-disable-next-line no-console
      this.logger?.error(colors.red(`[vite-plugin-pages] ${error.message}`))
      return
    }
    if (!exitsCustomBlock && !customBlock)
      return

    if (!customBlock) {
      this._customBlockMap.delete(path)
      debug.routeBlock('%s deleted', path)
      return
    }
    if (!exitsCustomBlock || !deepEqual(exitsCustomBlock, customBlock)) {
      debug.routeBlock('%s old: %O', path, exitsCustomBlock)
      debug.routeBlock('%s new: %O', path, customBlock)
      this._customBlockMap.set(path, customBlock)
      this._eventEmitter.emit('update')
    }
  }

  async resolveRoutes(): Promise<string | undefined> {
    if (this.options?.resolver === 'vue')
      return await resolveVueRoutes(this)
    if (this.options?.resolver === 'react')
      return await resolveReactRoutes(this)
    if (this.options?.resolver === 'solid')
      return await resolveSolidRoutes(this)
    if (this.options && isPageResolverFunc(this.options.resolver))
      return await this.options.resolver(this as BasePageContext)
  }

  get pageRouteMap() {
    return this._pageRouteMap
  }

  get customBlockMap() {
    return this._customBlockMap
  }

  get debug() {
    return debug
  }

  get events() {
    return this._eventEmitter
  }
}
