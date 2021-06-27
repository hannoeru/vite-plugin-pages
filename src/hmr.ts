import { ViteDevServer } from 'vite'
import { getPagesVirtualModule, isRouteBlockChanged, isTarget, debug, slash } from './utils'
import { removePage, addPage, updatePage } from './pages'
import { ResolvedOptions, ResolvedPage } from './types'

export function handleHMR(server: ViteDevServer, pages: Map<string, ResolvedPage>, options: ResolvedOptions, clearRoutes: () => void) {
  const { ws, watcher } = server

  function fullReload() {
    // invalidate module
    getPagesVirtualModule(server)
    clearRoutes()
    ws.send({
      type: 'full-reload',
    })
  }

  watcher.on('add', (file) => {
    const path = slash(file)
    if (isTarget(path, options)) {
      addPage(pages, path, options)
      debug.hmr('add', path)
      fullReload()
    }
  })
  watcher.on('unlink', (file) => {
    const path = slash(file)
    if (isTarget(path, options)) {
      removePage(pages, path)
      debug.hmr('remove', path)
      fullReload()
    }
  })
  watcher.on('change', (file) => {
    const path = slash(file)
    if (isTarget(path, options) && !options.react) {
      const needReload = isRouteBlockChanged(path, options)
      if (needReload) {
        updatePage(pages, path)
        debug.hmr('change', path)
        fullReload()
      }
    }
  })
}
