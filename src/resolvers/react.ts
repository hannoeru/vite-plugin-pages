import {
  countSlash,
  isCatchAllRoute,
  isDynamicRoute,
  normalizeCase,
} from '../utils'
import { generateClientCode } from '../stringify'

import type { Optional, ResolvedOptions } from '../types'
import type { PageContext } from '../context'

export interface Route {
  caseSensitive?: boolean
  children?: Route[]
  element?: string
  index?: boolean
  path: string
  rawRoute: string
}

export type PrepareRoute = Omit<Optional<Route, 'rawRoute' | 'path'>, 'children'> & {
  children?: PrepareRoute[]
}

function prepareRoutes(
  options: ResolvedOptions,
  routes: PrepareRoute[],
  parent?: PrepareRoute,
) {
  for (const route of routes) {
    if (parent)
      route.path = route.path?.replace(/^\//, '')

    if (route.children)
      route.children = prepareRoutes(options, route.children, route)

    delete route.rawRoute

    if (route.index)
      delete route.path

    Object.assign(route, options.extendRoute?.(route, parent) || {})
  }

  return routes
}

export async function resolveReactRoutes(ctx: PageContext) {
  const { nuxtStyle, caseSensitive } = ctx.options

  const pageRoutes = [...ctx.pageRouteMap.values()]
    // sort routes for HMR
    .sort((a, b) => countSlash(a.route) - countSlash(b.route))

  const routes: Route[] = []

  pageRoutes.forEach((page) => {
    const pathNodes = page.route.split('/')

    const element = page.path.replace(ctx.root, '')

    let parentRoutes = routes

    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i]
      const isDynamic = isDynamicRoute(node, nuxtStyle)
      const isCatchAll = isCatchAllRoute(node, nuxtStyle)
      const normalizedName = isDynamic
        ? nuxtStyle
          ? isCatchAll ? 'all' : node.replace(/^_/, '')
          : node.replace(/^\[(\.{3})?/, '').replace(/\]$/, '')
        : node
      const normalizedPath = normalizeCase(normalizedName, caseSensitive)

      const route: Route = {
        path: '',
        rawRoute: pathNodes.slice(0, i + 1).join('/'),
      }

      if (i === pathNodes.length - 1)
        route.element = element

      if (!route.path && normalizedPath === 'index') {
        route.index = true
      } else if (normalizedPath !== 'index') {
        if (isDynamic) {
          route.path = `:${normalizedName}`
          // Catch-all route
          if (isCatchAll)
            route.path = '*'
        } else {
          route.path = `${normalizedPath}`
        }
      }

      // Check parent exits
      const parent = parentRoutes.find((parent) => {
        return pathNodes.slice(0, i).join('/') === parent.rawRoute
      })

      if (parent) {
        // Make sure children exits in parent
        parent.children = parent.children || []
        // Append to parent's children
        parentRoutes = parent.children
      }

      const exits = parentRoutes.some((parent) => {
        return pathNodes.slice(0, i + 1).join('/') === parent.rawRoute
      })
      if (!exits)
        parentRoutes.push(route)
    }
  })

  // sort by dynamic routes
  let finalRoutes = prepareRoutes(ctx.options, routes)

  finalRoutes = (await ctx.options.onRoutesGenerated?.(finalRoutes)) || finalRoutes

  let client = generateClientCode(finalRoutes, ctx.options)
  client = (await ctx.options.onClientGenerated?.(client)) || client
  return client
}
