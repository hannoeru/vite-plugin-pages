import {
  countSlash,
  isCatchAllRoute,
  isDynamicRoute,
  normalizeCase,
  normalizeName,
} from '../utils'
import { generateClientCode } from '../stringify'

import type { CustomBlock, Optional } from '../types'
import type { PageContext } from '../context'

export interface VueRouteBase {
  name: string
  path: string
  props?: boolean
  component: string
  children?: VueRouteBase[]
  customBlock?: CustomBlock
  rawRoute: string
}

export interface VueRoute extends Omit<Optional<VueRouteBase, 'rawRoute' | 'name'>, 'children'> {
  children?: VueRoute[]
}

function prepareRoutes(
  ctx: PageContext,
  routes: VueRoute[],
  parent?: VueRoute,
) {
  for (const route of routes) {
    if (route.name)
      route.name = route.name.replace(/-index$/, '')

    if (parent)
      route.path = route.path?.replace(/^\//, '')

    if (route.children) {
      delete route.name
      route.children = prepareRoutes(ctx, route.children, route)
    }

    route.props = true

    delete route.rawRoute

    if (route.customBlock) {
      Object.assign(route, route.customBlock || {})
      delete route.customBlock
    }

    Object.assign(route, ctx.options.extendRoute?.(route, parent) || {})
  }

  return routes
}

export async function resolveVueRoutes(ctx: PageContext) {
  const { routeStyle, caseSensitive } = ctx.options

  const pageRoutes = [...ctx.pageRouteMap.values()]
    // sort routes for HMR
    .sort((a, b) => countSlash(a.route) - countSlash(b.route))

  const routes: VueRouteBase[] = []

  pageRoutes.forEach((page) => {
    const pathNodes = page.route.split('/')

    // add leading slash to component path if not already there
    const component = page.path.replace(ctx.root, '')
    const customBlock = ctx.customBlockMap.get(page.path)

    const route: VueRouteBase = {
      name: '',
      path: '',
      component,
      customBlock,
      rawRoute: page.route,
    }

    let parentRoutes = routes

    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i]
      const nuxtStyle = routeStyle === 'nuxt'
      const isDynamic = isDynamicRoute(node, nuxtStyle)
      const isCatchAll = isCatchAllRoute(node, nuxtStyle)
      const normalizedName = normalizeName(node, isDynamic, nuxtStyle)
      const normalizedPath = normalizeCase(normalizedName, caseSensitive)

      route.name += route.name ? `-${normalizedName}` : normalizedName

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
      } else if (normalizedPath === 'index') {
        if (!route.path)
          route.path = '/'
      } else if (normalizedPath !== 'index') {
        if (isDynamic) {
          route.path += `/:${normalizedName}`
          // Catch-all route
          if (isCatchAll) {
            if (i === 0)
              // root cache all route include children
              route.path += '(.*)*'
            else
              // nested cache all route not include children
              route.path += '(.*)'
          }
        } else {
          route.path += `/${normalizedPath}`
        }
      }
    }

    parentRoutes.push(route)
  })

  let finalRoutes = prepareRoutes(ctx, routes)

  finalRoutes = (await ctx.options.onRoutesGenerated?.(finalRoutes)) || finalRoutes

  let client = generateClientCode(finalRoutes, ctx.options)
  client = (await ctx.options.onClientGenerated?.(client)) || client
  return client
}
