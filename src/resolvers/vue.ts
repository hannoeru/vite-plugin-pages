import type { PageContext } from '../context'
import type { CustomBlock, Optional, PageResolver } from '../types'
import { isDeepEqual } from '@antfu/utils'

import { getRouteBlock } from '../customBlock'
import { generateClientCode } from '../stringify'
import {
  countSlash,
  isCatchAllRoute,
  isDynamicRoute,
  isEmptyRoutePath,
  normalizeCase,
  normalizeName,
} from '../utils'

export interface VueRouteBase {
  name: string
  path: string
  alias?: string
  props?: boolean
  component: string
  children?: VueRouteBase[]
  customBlock?: CustomBlock
  rawRoute: string
}

export interface VueRoute extends Omit<Optional<VueRouteBase, 'rawRoute' | 'name'>, 'children'> {
  children?: VueRoute[]
}

const catchAllChildPathRE = /^\/:[^/]+\(\.\*\)\*$/

function prepareRoutes(
  ctx: PageContext,
  routes: VueRoute[],
  parent?: VueRoute,
) {
  for (const route of routes) {
    if (parent)
      route.path = route.path?.replace(/^\//, '')

    if (route.children) {
      const catchAll = route.children.find(child => catchAllChildPathRE.test(child.path))
      if (catchAll && !route.children.some(child => isEmptyRoutePath(child.path)))
        catchAll.alias = ''
      route.children = prepareRoutes(ctx, route.children, route)
    }

    if (route.children?.find(c => c.name === route.name))
      delete route.name

    route.props = true

    delete route.rawRoute

    if (route.customBlock) {
      Object.assign(route, structuredClone(route.customBlock))
      delete route.customBlock
    }

    Object.assign(route, ctx.options.extendRoute?.(route, parent) || {})
  }

  return routes
}

function assertUniqueRouteNames(routes: VueRoute[], pageFiles: Map<VueRoute, string>, seen = new Map<string, VueRoute>()) {
  for (const route of routes) {
    if (route.name !== undefined) {
      const other = seen.get(route.name)
      if (other)
        throw new Error(`[vite-plugin-pages] Duplicate route name "${route.name}" for "${pageFiles.get(other)}" and "${pageFiles.get(route)}". vue-router keeps only one route with a given name. Rename one of the pages, or set a different \`name\` in a <route> block or with \`extendRoute\`.`)
      seen.set(route.name, route)
    }
    if (route.children)
      assertUniqueRouteNames(route.children, pageFiles, seen)
  }
}

async function computeVueRoutes(ctx: PageContext, customBlockMap: Map<string, CustomBlock>): Promise<VueRoute[]> {
  const { routeStyle, caseSensitive, routeNameSeparator } = ctx.options

  const pageRoutes = [
    ...ctx.pageRouteMap.values(),
  ]
    // sort routes for HMR
    .sort((a, b) => countSlash(a.route) - countSlash(b.route))

  const routes: VueRouteBase[] = []
  const pageFiles = new Map<VueRoute, string>()

  pageRoutes.forEach((page) => {
    const pathNodes = page.route.split('/')

    // add leading slash to component path if not already there
    const component = ctx.getImportPath(page.path)
    const customBlock = customBlockMap.get(page.path)

    const route: VueRouteBase = {
      name: '',
      path: '',
      component,
      customBlock,
      rawRoute: page.route,
    }
    pageFiles.set(route, page.path)

    let parentRoutes = routes
    let dynamicRoute = false

    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i]
      const nuxtStyle = routeStyle === 'nuxt'
      const isDynamic = isDynamicRoute(node, nuxtStyle)
      const isCatchAll = isCatchAllRoute(node, nuxtStyle)
      const normalizedName = normalizeName(node, isDynamic, nuxtStyle)
      const normalizedPath = normalizeCase(normalizedName, caseSensitive)
      const isIndex = !isDynamic && normalizedPath === 'index'
      const nameNode = isIndex ? 'index' : normalizedName

      if (isDynamic) {
        dynamicRoute = true
        if (!/^\w+$/.test(normalizedName))
          throw new Error(`[vite-plugin-pages] Invalid route parameter name "${normalizedName}" in "${page.path}". A parameter name can contain only letters, digits, and underscores.`)
      }

      if (!route.name) {
        route.name = isDynamic && normalizedName === 'index'
          ? `${routeNameSeparator}index`
          : nameNode
      }
      else if (!isIndex || i < pathNodes.length - 1) {
        route.name += `${routeNameSeparator}${nameNode}`
      }

      // Check parent exits
      const parent = parentRoutes.find((parent) => {
        return pathNodes.slice(0, i + 1).join('/') === parent.rawRoute
      })

      if (parent) {
        // Make sure children exist in parent
        parent.children = parent.children || []
        // Append to parent's children
        parentRoutes = parent.children
        // Reset path
        route.path = ''
      }
      else if (isIndex) {
        if (!route.path && i === pathNodes.length - 1)
          route.path = '/'
      }
      else {
        if (isDynamic) {
          route.path += `/:${normalizedName}`
          if (isCatchAll) {
            route.path += '(.*)*'
          }
          else if (nuxtStyle && i === pathNodes.length - 1) {
            // we need to search if the folder provide `index.vue`
            const indexRoute = normalizeCase([
              ...pathNodes.slice(0, i),
              'index',
            ].join('/'), caseSensitive)
            const isIndexFound = pageRoutes.some(({ route }) => normalizeCase(route, caseSensitive) === indexRoute)
            if (!isIndexFound)
              route.path += '?'
          }
        }
        else {
          route.path += `/${normalizedPath}`
        }
      }
    }

    // put dynamic routes at the end
    if (dynamicRoute)
      parentRoutes.push(route)
    else
      parentRoutes.unshift(route)
  })

  let finalRoutes = prepareRoutes(ctx, routes)
  assertUniqueRouteNames(finalRoutes, pageFiles)

  finalRoutes = (await ctx.options.onRoutesGenerated?.(finalRoutes)) || finalRoutes

  return finalRoutes
}

async function resolveVueRoutes(ctx: PageContext, customBlockMap: Map<string, CustomBlock>) {
  const finalRoutes = await computeVueRoutes(ctx, customBlockMap)

  let client = generateClientCode(finalRoutes, ctx.options)
  client = (await ctx.options.onClientGenerated?.(client)) || client
  return client
}

export function vueResolver(): PageResolver {
  const customBlockMap = new Map<string, CustomBlock>()
  const customBlockReadFailed = Symbol('customBlockReadFailed')

  async function readCustomBlock(ctx: PageContext, path: string) {
    try {
      return await getRouteBlock(path, ctx.options)
    }
    catch (error) {
      const message = error instanceof Error
        ? error.message
        : String(error)
      ctx.logger?.error(`[vite-plugin-pages] ${message}`)
      return customBlockReadFailed
    }
  }

  async function addCustomBlock(ctx: PageContext, path: string) {
    const customBlock = await readCustomBlock(ctx, path)
    if (!customBlock || customBlock === customBlockReadFailed)
      return

    ctx.debug.routeBlock('%s new: %O', path, customBlock)
    customBlockMap.set(path, customBlock)
  }

  async function refreshCustomBlock(ctx: PageContext, path: string) {
    const existingCustomBlock = customBlockMap.get(path)
    const customBlock = await readCustomBlock(ctx, path)
    if (customBlock === customBlockReadFailed || isDeepEqual(existingCustomBlock, customBlock))
      return false

    if (!customBlock) {
      customBlockMap.delete(path)
      ctx.debug.routeBlock('%s deleted', path)
      return true
    }
    ctx.debug.routeBlock('%s old: %O', path, existingCustomBlock)
    ctx.debug.routeBlock('%s new: %O', path, customBlock)
    customBlockMap.set(path, customBlock)
    return true
  }

  return {
    resolveExtensions() {
      return ['vue', 'ts', 'js']
    },
    resolveModuleIds() {
      return ['~pages', 'pages-generated', 'virtual:generated-pages']
    },
    async resolveRoutes(ctx) {
      return resolveVueRoutes(ctx, customBlockMap)
    },
    async getComputedRoutes(ctx) {
      return computeVueRoutes(ctx, customBlockMap)
    },
    hmr: {
      added: addCustomBlock,
      changed: refreshCustomBlock,
      removed: (_ctx, path) => {
        customBlockMap.delete(path)
      },
    },
  }
}
