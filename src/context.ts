import fs from 'fs'
import { resolve, join, extname } from 'path'
import deepEqual from 'deep-equal'
import { toArray, slash } from '@antfu/utils'
import { resolveOptions } from './options'
import { getPageFiles } from './files'
import { isTarget, invalidatePagesModule, debug } from './utils'
import { resolveReactRoutes } from './resolvers/react'
import { resolveVueRoutes } from './resolvers/vue'
import { getRouteBlock } from './customBlock'

import type { ViteDevServer } from 'vite'
import type { CustomBlock, ResolvedOptions, UserOptions, SupportedPagesResolver, PageOptions } from './types'

export type PageRoute = {
  path: string
  route: string
}

export class PageContext {
  private _server: ViteDevServer | undefined
  private _pageRouteMap = new Map<string, PageRoute>()
  private _customBlockMap: Map<string, CustomBlock> = new Map()

  rawOptions: UserOptions
  root = slash(process.cwd())
  options: ResolvedOptions

  constructor(userOptions: UserOptions = {}) {
    this.rawOptions = userOptions
    this.options = resolveOptions(userOptions, this.root)
    debug.options(this.options)
    this.setResolver(this.options.resolver)
  }

  setRoot(root: string) {
    if (this.root === root)
      return
    debug.env('root', root)
    this.root = slash(root)
    this.options = resolveOptions(this.rawOptions, this.root)
  }

  setResolver(resolver: SupportedPagesResolver) {
    debug.resolver(resolver)
    this.options.resolver = resolver
  }

  setupViteServer(server: ViteDevServer) {
    if (this._server === server)
      return

    this._server = server
    this.setupWatcher(server.watcher)
  }

  setupWatcher(watcher: fs.FSWatcher) {
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
        const page = this.options.dirs.find(i => path.startsWith(`/${i.dir}`))!
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
    const customBlock = await getRouteBlock(path, this.options)
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
