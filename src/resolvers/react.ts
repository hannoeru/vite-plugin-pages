import {
  buildReactRemixRoutePath,
  buildReactRoutePath,
  countSlash,
  normalizeCase,
} from '../utils'
import { generateClientCode } from '../stringify'

import type { Optional, ResolvedOptions } from '../types'
import type { PageContext } from '../context'

interface Route {
  caseSensitive?: boolean
  children?: Route[]
  element?: string
  index?: boolean
  path?: string
  rawRoute: string
}

type PrepareRoutes = Omit<Optional<Route, 'rawRoute' | 'path'>, 'children'> & {
  children?: PrepareRoutes[]
}

function prepareRoutes(
  routes: PrepareRoutes[],
  options: ResolvedOptions,
  parent?: PrepareRoutes,
) {
  for (const route of routes) {
    if (parent)
      route.path = route.path?.replace(/^\//, '')

    if (route.children)
      route.children = prepareRoutes(route.children, options, route)

    delete route.rawRoute

    if (route.index)
      delete route.path

    Object.assign(route, options.extendRoute?.(route, parent) || {})
  }

  return routes
}

export async function resolveReactRoutes(ctx: PageContext) {
  const { routeStyle, caseSensitive } = ctx.options

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

      const route: Route = {
        caseSensitive,
        path: '',
        rawRoute: pathNodes.slice(0, i + 1).join('/'),
      }

      if (i === pathNodes.length - 1) route.element = element

      const isIndexRoute = normalizeCase(node, caseSensitive).endsWith('index')

      if (!route.path && isIndexRoute) {
        route.index = true
      } else if (!isIndexRoute) {
        if (routeStyle === 'remix')
          route.path = buildReactRemixRoutePath(node)
        else
          route.path = buildReactRoutePath(node)
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
  let finalRoutes = prepareRoutes(routes, ctx.options)

  finalRoutes = (await ctx.options.onRoutesGenerated?.(finalRoutes)) || finalRoutes

  let client = generateClientCode(finalRoutes, ctx.options)
  client = (await ctx.options.onClientGenerated?.(client)) || client
  return client
}
