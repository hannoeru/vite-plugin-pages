import { dirname, extname, parse } from 'path'
import { PageContext } from '../context'
import { ResolvedOptions } from '../types'
import {
  countSlash,
  isDynamicRoute,
  isCatchAllRoute,
} from '../utils'
import { generateClientCode } from '../stringify'

interface Route {
  caseSensitive?: boolean
  children?: Route[]
  element: string
  index?: boolean
  path: string
}

function prepareRoutes(
  routes: any[],
  options: ResolvedOptions,
  parent?: Route,
) {
  for (const route of routes) {
    if (parent)
      route.path = route.path.replace(/^\//, '')

    if (route.children)
      route.children = prepareRoutes(route.children, options, route)

    if (route.index)
      delete route.path

    Object.assign(route, options.extendRoute?.(route, parent) || {})
  }

  return routes
}

export async function resolveReactRoutes(ctx: PageContext) {
  const { nuxtStyle } = ctx.options

  const pageRoutes = [...ctx.pageRouteMap.values()]
    .sort((a, b) => {
      if (countSlash(a.route) === countSlash(b.route)) {
        const aDynamic = a.route.split('/').some(r => isDynamicRoute(r, nuxtStyle))
        const bDynamic = b.route.split('/').some(r => isDynamicRoute(r, nuxtStyle))
        if (aDynamic && bDynamic)
          return a.route.localeCompare(b.route)
        else if (aDynamic)
          return 1
        else
          return -1
      } else {
        return countSlash(a.route) - countSlash(b.route)
      }
    })

  const routes: Route[] = []

  pageRoutes.forEach((page) => {
    const pathNodes = page.route.split('/')

    // add leading slash to component path if not already there
    const element = page.path.startsWith('/') ? page.path : `/${page.path}`

    const route: Route = {
      path: '',
      element,
    }

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
      const normalizedPath = normalizedName.toLowerCase()

      // Check parent exits
      const parent = parentRoutes.find(node => node.element.replace(extname(node.element), '') === dirname(route.element))

      if (parent) {
        // Make sure children exits in parent
        parent.children = parent.children || []
        // Append to parent's children
        parentRoutes = parent.children
        // Reset path
        route.path = ''
      } else if (!route.path && normalizedPath === 'index') {
        route.index = true
      } else if (normalizedPath !== 'index') {
        if (isDynamic) {
          route.path += `/:${normalizedName}`
          // Catch-all route
          if (isCatchAll)
            route.path = '*'
        } else {
          route.path += `/${normalizedPath}`
        }
      }
    }

    parentRoutes.push(route)
  })

  // sort by dynamic routes
  let finalRoutes = prepareRoutes(routes, ctx.options)

  // replace duplicated cache all route
  const allRoute = finalRoutes.find((i) => {
    return isCatchAllRoute(parse(i.element).name, nuxtStyle)
  })
  if (allRoute) {
    finalRoutes = finalRoutes.filter(i => !isCatchAllRoute(parse(i.element).name, nuxtStyle))
    finalRoutes.push(allRoute)
  }

  finalRoutes = (await ctx.options.onRoutesGenerated?.(finalRoutes)) || finalRoutes

  let client = generateClientCode(finalRoutes, ctx.options)
  client = (await ctx.options.onClientGenerated?.(client)) || client
  return client
}
