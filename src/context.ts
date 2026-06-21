import type { Logger, ViteDevServer } from 'vite'
import type { PageOptions, ResolvedOptions, UserOptions } from './types'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { slash, toArray } from '@antfu/utils'
import { getPageFiles } from './files'
import { resolveOptions } from './options'

import { debug, invalidatePagesModule, isTarget } from './utils'

export interface PageRoute {
  path: string
  route: string
}

export class PageContext {
  private _server: ViteDevServer | undefined
  private _pageRouteMap = new Map<string, PageRoute>()

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

  setupWatcher(watcher: ViteDevServer['watcher']) {
    watcher
      .on('unlink', async (path) => {
        path = slash(path)
        if (!isTarget(path, this.options))
          return
        await this.removePage(path)
        this.onUpdate()
      })
    watcher
      .on('add', async (path) => {
        path = slash(path)
        if (!isTarget(path, this.options))
          return
        const page = this.options.dirs.find(i => path.startsWith(slash(resolve(this.root, i.dir))))!
        await this.addPage(path, page)
        this.onUpdate()
      })

    watcher
      .on('change', async (path) => {
        path = slash(path)
        if (!isTarget(path, this.options))
          return
        const page = this._pageRouteMap.get(path)
        if (page)
          await this.options.resolver.hmr?.changed?.(this, path)
      })
  }

  async addPage(path: string | string[], pageDir: PageOptions) {
    debug.pages('add', path)
    const cleanRoute = pageDir.cleanRoute || ((route:string)=>route);
    for (const p of toArray(path)) {
      const pageDirPath = slash(resolve(this.root, pageDir.dir))
      const extension = this.options.extensions.find(ext => p.endsWith(`.${ext}`))
      if (!extension)
        continue

      const route = slash(join(pageDir.baseRoute, p.replace(`${pageDirPath}/`, '').replace(`.${extension}`, '')))
      this._pageRouteMap.set(p, {
        path: p,
        route: cleanRoute(route, p),
      })
      await this.options.resolver.hmr?.added?.(this, p)
    }
  }

  async removePage(path: string) {
    debug.pages('remove', path)
    this._pageRouteMap.delete(path)
    await this.options.resolver.hmr?.removed?.(this, path)
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
    return this.options.resolver.resolveRoutes(this)
  }

  async searchGlob() {
    const pageDirFiles = this.options.dirs.map((page) => {
      const pagesDirPath = slash(resolve(this.options.root, page.dir))
      const files = getPageFiles(pagesDirPath, this.options, page)
      debug.search(page.dir, files)
      return {
        ...page,
        files: files.map(file => slash(file)),
      }
    })

    for (const page of pageDirFiles)
      await this.addPage(page.files, page)

    debug.cache(this.pageRouteMap)
  }

  get debug() {
    return debug
  }

  get pageRouteMap() {
    return this._pageRouteMap
  }
}
