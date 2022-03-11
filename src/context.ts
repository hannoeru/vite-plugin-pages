import { extname, join, resolve } from 'path'
import deepEqual from 'deep-equal'
import { slash, toArray } from '@antfu/utils'
import colors from 'picocolors'
import { resolveOptions } from './options'
import { getPageFiles } from './files'
import { debug, invalidatePagesModule, isTarget } from './utils'
import { resolveReactRoutes } from './resolvers/react'
import { resolveVueRoutes } from './resolvers/vue'
import { resolveSolidRoutes } from './resolvers/solid'
import { getRouteBlock } from './customBlock'

import type { FSWatcher } from 'fs'
import type { Logger, ViteDevServer } from 'vite'
import type { CustomBlock, PageOptions, ResolvedOptions, UserOptions } from './types'

export interface PageRoute {
  path: string
  route: string
}

export class PageContext {
  private _server: ViteDevServer | undefined
  private _pageRouteMap = new Map<string, PageRoute>()
  private _customBlockMap: Map<string, CustomBlock> = new Map()

  rawOptions: UserOptions
  root: string
  options: ResolvedOptions
  logger?: Logger

  constructor(userOptions: UserOptions, viteRoot: string = process.cwd()) {
    this.rawOptions = userOptions
    this.root = slash(viteRoot)
    debug.env('root', this.root)
    this.options = resolveOptions(userOptions, this.root)
    debug.options(this.options)
  }

  setLogger(logger: Logger) {
    this.logger = logger
  }

  setupViteServer(server: ViteDevServer) {
    if (this._server === server)
      return

    this._server = server
    this.setupWatcher(server.watcher)
  }

  setupWatcher(watcher: FSWatcher) {
    watcher
      .on('unlink', (path) => {
        path = slash(path)
        if (!isTarget(path, this.options))
          return
        this.removePage(path)
        this.onUpdate()
      })
    watcher
      .on('add', async(path) => {
        path = slash(path)
        if (!isTarget(path, this.options))
          return
        const page = this.options.dirs.find(i => path.startsWith(slash(resolve(this.root, i.dir))))!
        await this.addPage(path, page)
        this.onUpdate()
      })

    watcher
      .on('change', async(path) => {
        path = slash(path)
        if (!isTarget(path, this.options))
          return
        const page = this._pageRouteMap.get(path)
        if (page)
          this.checkCustomBlockChange(path)
      })
  }

  async addPage(path: string | string[], pageDir: PageOptions) {
    debug.pages('add', path)
    for (const p of toArray(path)) {
      const pageDirPath = slash(resolve(this.root, pageDir.dir))
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
    if (this.options.resolver !== 'vue')
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
      this.onUpdate()
    }
  }

  onUpdate() {
    if (!this._server)
      return

    invalidatePagesModule(this._server)
    debug.hmr('Reload generated pages.')
    this._server.ws.send({
      type: 'full-reload',
    })
  }

  async resolveRoutes() {
    if (this.options.resolver === 'vue')
      return await resolveVueRoutes(this)
    if (this.options.resolver === 'react')
      return await resolveReactRoutes(this)
    if (this.options.resolver === 'solid')
      return await resolveSolidRoutes(this)
  }

  async searchGlob() {
    const pageDirFiles = this.options.dirs.map((page) => {
      const pagesDirPath = slash(resolve(this.options.root, page.dir))
      const files = getPageFiles(pagesDirPath, this.options)
      debug.search(page.dir, files)
      return {
        ...page,
        files: files.map(file => slash(file)),
      }
    })

    for (const page of pageDirFiles)
      await this.addPage(page.files, page)

    debug.cache(this.pageRouteMap)
    debug.cache(this.customBlockMap)
  }

  get debug() {
    return debug
  }

  get pageRouteMap() {
    return this._pageRouteMap
  }

  get customBlockMap() {
    return this._customBlockMap
  }
}
