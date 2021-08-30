import { join, extname, resolve } from 'path'
import { PageDirOptions, ResolvedOptions, ResolvedPages, ResolvedPage } from './types'
import { getPageFiles } from './files'
import { getRouteBlock, routeBlockCache, toArray, slash } from './utils'

export function removePage(
  pages: ResolvedPages,
  file: string,
) {
  pages.delete(file)
}

export function updatePage(
  pages: ResolvedPages,
  file: string,
) {
  const page = pages.get(file)
  if (page) {
    const customBlock = routeBlockCache.get(file) || null
    page.customBlock = customBlock
    pages.set(file, page)
  }
}

export async function addPage(
  pages: ResolvedPages,
  file: string,
  options: ResolvedOptions,
) {
  file = file.replace(options.root, '')
  const pageDir = options.pagesDir.find(i => file.startsWith(`/${i.dir}`))
  if (!pageDir) return

  await setPage(pages, pageDir, file.replace(`/${pageDir.dir}/`, ''), options)
}

export async function resolvePages(options: ResolvedOptions) {
  const dirs = toArray(options.pagesDir)

  const pages = new Map<string, ResolvedPage>()

  const pageDirFiles = dirs.map((pageDir) => {
    const pagePath = slash(resolve(options.root, pageDir.dir))
    return {
      ...pageDir,
      files: getPageFiles(pagePath, options),
    }
  })

  for (const pageDir of pageDirFiles) {
    for (const file of pageDir.files)
      await setPage(pages, pageDir, file, options)
  }

  const routes: string[] = []

  for (const page of pages.values()) {
    if (!routes.includes(page.route))
      routes.push(page.route)
    else
      throw new Error(`[vite-plugin-pages] duplicate route in ${page.filepath}`)
  }

  return pages
}

async function setPage(
  pages: ResolvedPages,
  pageDir: PageDirOptions,
  file: string,
  options: ResolvedOptions,
) {
  const component = slash(join(pageDir.dir, file))
  const filepath = slash(resolve(options.root, component))
  const extension = extname(file).slice(1)
  const customBlock = ['vue', 'md'].includes(extension)
    ? await getRouteBlock(filepath, options)
    : null

  pages.set(filepath, {
    dir: pageDir.dir,
    route: slash(join(pageDir.baseRoute, file.replace(options.extensionsRE, ''))),
    extension,
    filepath,
    component,
    customBlock,
  })
}

function countSlash(value: string) {
  return (value.match(/\//g) || []).length
}

export function sortPages(pages: ResolvedPages) {
  return [...pages]
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(([_, value]) => value)
    .sort((a, b) => {
      return countSlash(a.route) - countSlash(b.route)
    })
}
