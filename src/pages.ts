import { join, extname, resolve } from 'path'
import { ResolvedOptions, ResolvedPage } from './types'
import { getPageFiles } from './files'
import { getRouteBlock, routeBlockCache, toArray, slash } from './utils'

export function removePage(
  pages: Map<string, ResolvedPage>,
  file: string,
) {
  pages.delete(file)
}

export function updatePage(
  pages: Map<string, ResolvedPage>,
  file: string,
) {
  const page = pages.get(file)
  if (page) {
    const customBlock = routeBlockCache.get(file) || null
    page.customBlock = customBlock
    pages.delete(file)
    pages.set(file, page)
  }
}

export function addPage(
  pages: Map<string, ResolvedPage>,
  file: string,
  options: ResolvedOptions,
) {
  const pageDir = options.pagesDir.find(i => file.replace(options.root, '').startsWith(i.dir))
  if (!pageDir) return

  const component = join(pageDir.dir, file)
  const filepath = slash(resolve(options.root, component))
  const extension = extname(file).slice(1)
  const customBlock = ['vue', 'md'].includes(extension)
    ? getRouteBlock(filepath, options)
    : null

  pages.set(filepath, {
    dir: pageDir.dir,
    route: join(pageDir.baseRoute, file.replace(options.extensionsRE, '')),
    extension,
    filepath,
    component,
    customBlock,
  })
}

export function resolvePages(options: ResolvedOptions) {
  const dirs = toArray(options.pagesDir)
  const {
    root,
    extensionsRE,
  } = options

  const pages = new Map<string, ResolvedPage>()

  const pageDirFiles = dirs.map((pageDir) => {
    return {
      ...pageDir,
      files: getPageFiles(pageDir.dir, options),
    }
  })

  for (const pageDir of pageDirFiles) {
    pageDir.files.forEach((file) => {
      const component = join(pageDir.dir, file)
      const filepath = slash(resolve(root, component))
      const extension = extname(file).slice(1)
      const customBlock = ['vue', 'md'].includes(extension)
        ? getRouteBlock(filepath, options)
        : null

      pages.set(filepath, {
        dir: pageDir.dir,
        route: join(pageDir.baseRoute, file.replace(extensionsRE, '')),
        extension,
        filepath,
        component,
        customBlock,
      })
    })
  }

  const routes: string[] = []

  for (const page of pages.values()) {
    if (!routes.includes(page.route))
      routes.push(page.route)
    else
      throw new Error('[vite-plugin-pages] duplicate routes')
  }

  return pages
}
