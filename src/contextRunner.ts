import { resolve } from 'path'
import { slash } from '@antfu/utils'
import { debug, invalidatePagesModule, isTarget } from './utils'
import { resolveOptions } from './options'
import { getPageFiles } from './files'
import type { BasePageContext, ResolvedOptions, UserOptions } from './types'
import type { Logger, ViteDevServer } from 'vite'
import type { FSWatcher } from 'fs'

export class ContextRunner {
  private _server: ViteDevServer | undefined
  private pageContext: BasePageContext

  rawOptions: UserOptions
  root: string
  options: ResolvedOptions
  logger?: Logger

  constructor(userOptions: UserOptions, pageContext: BasePageContext, viteRoot: string = process.cwd()) {
    this.pageContext = pageContext
    this.rawOptions = userOptions
    this.root = slash(viteRoot)
    debug.env('root', this.root)
    this.options = resolveOptions(userOptions, this.root)
    debug.options(this.options)

    pageContext.setViteInfo(viteRoot)
    pageContext.setUserOptions(this.options)

    pageContext.events.on('update', () => {
      this.onUpdate()
    })
  }

  setLogger(logger: Logger) {
    this.logger = logger
    this.pageContext.setLogger(logger)
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
        this.pageContext.removePage(path)
        this.onUpdate()
      })
    watcher
      .on('add', async(path) => {
        path = slash(path)
        if (!isTarget(path, this.options))
          return
        const page = this.options.dirs.find(i => path.startsWith(slash(resolve(this.root, i.dir))))!
        await this.pageContext.addPage(path, page)
        this.onUpdate()
      })

    watcher
      .on('change', async(path) => {
        path = slash(path)
        if (!isTarget(path, this.options))
          return
        const page = this.pageContext.pageRouteMap.get(path)
        if (page)
          this.pageContext.checkCustomBlockChange(path)
      })
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
      await this.pageContext.addPage(page.files, page)

    debug.cache(this.pageContext.pageRouteMap)
    debug.cache(this.pageContext.customBlockMap)
  }

  async resolveRoutes() {
    return await this.pageContext.resolveRoutes()
  }

  get debug() {
    return debug
  }

  get pageRouteMap() {
    return this.pageContext.pageRouteMap
  }

  get customBlockMap() {
    return this.pageContext.customBlockMap
  }
}
