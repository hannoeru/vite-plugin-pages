/**
 * https://github.com/brattonross/vite-plugin-voie/blob/main/packages/vite-plugin-voie/src/routes.ts
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file at
 * https://github.com/brattonross/vite-plugin-voie/blob/main/LICENSE
 */

import { parse } from 'path'
import { Route, ResolvedOptions, ResolvedPages } from './types'
import {
  isDynamicRoute,
  isCatchAllRoute,
} from './utils'
import { stringifyRoutes } from './stringify'
import { sortPages } from './pages'

function prepareRoutes(
  routes: Route[],
  options: ResolvedOptions,
  parent?: Route,
) {
  for (const route of routes) {
    if (route.name)
      route.name = route.name.replace(/-index$/, '')

    if (parent)
      route.path = route.path.replace(/^\//, '')

    if (!options.react)
      route.props = true

    if (options.react) {
      delete route.name
      route.routes = route.children
      delete route.children
      route.exact = true
    }

    if (route.children) {
      delete route.name
      route.children = prepareRoutes(route.children, options, route)
    }

    if (!options.react)
      Object.assign(route, route.customBlock || {})

    delete route.customBlock

    Object.assign(route, options.extendRoute?.(route, parent) || {})
  }

  return routes
}

export function generateRoutes(pages: ResolvedPages, options: ResolvedOptions): Route[] {
  const {
    nuxtStyle,
  } = options

  const routes: Route[] = []

  sortPages(pages).forEach((page) => {
    const pathNodes = page.route.split('/')

    // add leading slash to component path if not already there
    const component = page.component.startsWith('/') ? page.component : `/${page.component}`

    const route: Route = {
      name: '',
      path: '',
      component,
      customBlock: page.customBlock,
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

      route.name += route.name ? `-${normalizedName}` : normalizedName

      // Check nested route
      const parent = parentRoutes.find(node => node.name === route.name)

      if (parent) {
        parent.children = parent.children || []
        parentRoutes = parent.children
        route.path = ''
      } else if (normalizedName.toLowerCase() === 'index' && !route.path) {
        route.path += '/'
      } else if (normalizedName.toLowerCase() !== 'index') {
        if (isDynamic) {
          route.path += `/:${normalizedName}`
          // Catch-all route
          if (isCatchAll)
            route.path += '(.*)*'
        } else {
          route.path += `/${normalizedPath}`
        }
      }
    }

    parentRoutes.push(route)
  })

  const preparedRoutes = prepareRoutes(routes, options)

  let finalRoutes = preparedRoutes.sort((a, b) => {
    if (a.path.includes(':') && b.path.includes(':'))
      return b.path > a.path ? 1 : -1
    else if (a.path.includes(':') || b.path.includes(':'))
      return a.path.includes(':') ? 1 : -1
    else
      return b.path > a.path ? 1 : -1
  })

  // replace duplicated cache all route
  const allRoute = finalRoutes.find((i) => {
    return isCatchAllRoute(parse(i.component).name, nuxtStyle)
  })
  if (allRoute) {
    finalRoutes = finalRoutes.filter(i => !isCatchAllRoute(parse(i.component).name, nuxtStyle))
    finalRoutes.push(allRoute)
  }

  return finalRoutes
}

export function generateClientCode(routes: Route[], options: ResolvedOptions) {
  const { imports, stringRoutes } = stringifyRoutes(routes, options)

  return `${imports.join(';\n')};\n\nconst routes = ${stringRoutes};\n\nexport default routes;`
}
