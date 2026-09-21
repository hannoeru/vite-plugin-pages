import type { HotUpdateOptions, Logger } from 'vite'
import type { PageOptions, ResolvedOptions, UserOptions } from './types'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { slash, toArray } from '@antfu/utils'
import { getPageFiles } from './files'
import { resolveOptions } from './options'
import { RouteChange } from './types'

import { debug, findPageDir, isTarget } from './utils'

export interface PageRoute {
  path: string
  route: string
}

export class PageContext {
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

  async handleFileChange(type: HotUpdateOptions['type'], path: string) {
    path = slash(path)
    if (!isTarget(path, this.options))
      return RouteChange.None

    if (type === 'create') {
      if (this._pageRouteMap.has(path))
        return RouteChange.None

      await this.addPage(path, findPageDir(path, this.options)!)
      return RouteChange.RouteSet
    }

    if (!this._pageRouteMap.has(path))
      return RouteChange.None

    if (type === 'delete') {
      await this.removePage(path)
      return RouteChange.RouteSet
    }

    return await this.options.resolver.hmr?.changed?.(this, path) ?? RouteChange.None
  }

  async addPage(path: string | string[], pageDir: PageOptions) {
    debug.pages('add', path)
    for (const p of toArray(path)) {
      const pageDirPath = slash(resolve(this.root, pageDir.dir))
      const extension = this.options.extensions.find(ext => p.endsWith(`.${ext}`))
      if (!extension)
        continue

      const route = slash(join(pageDir.baseRoute ?? '', p.replace(`${pageDirPath}/`, '').replace(`.${extension}`, '')))
      this._pageRouteMap.set(p, {
        path: p,
        route,
      })
      await this.options.resolver.hmr?.added?.(this, p)
    }
  }

  async removePage(path: string) {
    debug.pages('remove', path)
    this._pageRouteMap.delete(path)
    await this.options.resolver.hmr?.removed?.(this, path)
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
