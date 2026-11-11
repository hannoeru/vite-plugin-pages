import type { HotUpdateOptions, Logger } from 'vite'
import type { PageOptions, ResolvedOptions, UserOptions } from './types'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { slash, toArray } from '@antfu/utils'
import { getPageFiles } from './files'
import { expandPageDirs, normalizePageDirs, resolveOptions } from './options'

import { debug, findPageDir, removePageExtension } from './utils'

export interface PageRoute {
  path: string
  route: string
}

export class PageContext {
  private _pageRouteMap = new Map<string, PageRoute>()

  rawOptions: UserOptions
  root: string
  pageDirPatterns: PageOptions[]
  options: ResolvedOptions
  logger?: Logger

  constructor(userOptions: UserOptions, viteRoot: string = process.cwd()) {
    this.rawOptions = userOptions
    this.root = slash(viteRoot)
    debug.env('root', this.root)
    this.options = resolveOptions(userOptions, this.root)
    this.pageDirPatterns = normalizePageDirs(userOptions.dirs, this.root)
    debug.options(this.options)
  }

  setLogger(logger: Logger) {
    this.logger = logger
  }

  async handleFileChange(type: HotUpdateOptions['type'], path: string) {
    path = slash(path)
    let pageDir = findPageDir(path, this.options)
    if (!pageDir && type === 'create' && this.options.extensionsRE.test(path)) {
      this.options.dirs = expandPageDirs(this.pageDirPatterns, this.root)
      pageDir = findPageDir(path, this.options)
    }
    if (!pageDir)
      return false

    if (type === 'create') {
      if (this._pageRouteMap.has(path))
        return false

      await this.addPage(path, pageDir)
      return true
    }

    if (!this._pageRouteMap.has(path))
      return false

    if (type === 'delete') {
      await this.removePage(path)
      return true
    }

    return await this.options.resolver.hmr?.changed?.(this, path) ?? false
  }

  async addPage(path: string | string[], pageDir: PageOptions) {
    debug.pages('add', path)
    for (const p of toArray(path)) {
      const pageDirPath = slash(resolve(this.root, pageDir.dir))
      const pagePath = removePageExtension(p, this.options.extensions)
      if (!pagePath)
        continue

      const route = slash(join(pageDir.baseRoute ?? '', pagePath.replace(`${pageDirPath}/`, '')))
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

  getImportPath(path: string) {
    return this.options.importPath === 'relative' && path.startsWith(`${this.root}/`)
      ? path.slice(this.root.length)
      : path
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
