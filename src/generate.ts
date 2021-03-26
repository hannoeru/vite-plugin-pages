/**
 * https://github.com/brattonross/vite-plugin-voie/blob/main/packages/vite-plugin-voie/src/routes.ts
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file at
 * https://github.com/brattonross/vite-plugin-voie/blob/main/LICENSE
 */

import fs from 'fs'
import { join } from 'path'
import deepEqual from 'deep-equal'
import { Route, ResolvedOptions, PageDirOptions } from './types'
import { debug, isDynamicRoute, isCatchAllRoute, normalizePath, findRouteByFilename } from './utils'
import { stringifyRoutes } from './stringify'
import { parseCustomBlock, parseSFC } from './parseSfc'

function prepareRoutes(
  routes: Route[],
  options: ResolvedOptions,
  pagesDirOptions: PageDirOptions,
  parent?: Route,
) {
  for (const route of routes) {
    if (route.name) {
      route.name = route.name.replace(/-index$/, '')
      if (pagesDirOptions.baseRoute)
        route.name = `${pagesDirOptions.baseRoute}-${route.name}`
    }

    if (parent) {
      route.path = route.path.replace(/^\//, '')
    }
    else {
      if (pagesDirOptions.baseRoute) {
        const baseRoute = `/${pagesDirOptions.baseRoute}`
        route.path = route.path === '/'
          ? baseRoute
          : baseRoute + route.path
      }
    }

    route.props = true

    if (route.children) {
      delete route.name
      route.children = prepareRoutes(route.children, options, pagesDirOptions, route)
    }
    const filePath = normalizePath(join(options.root, route.component))
    const content = fs.readFileSync(filePath, 'utf8')
    const parsed = parseSFC(content)
    const routeBlock = parsed.customBlocks.find(b => b.type === 'route')

    if (routeBlock)
      Object.assign(route, parseCustomBlock(routeBlock, filePath, options))

    if (typeof options.extendRoute === 'function')
      Object.assign(route, options.extendRoute(route, parent) || {})
  }
  return routes
}

export function generateRoutes(filesPath: string[], pagesDirOptions: PageDirOptions, options: ResolvedOptions): Route[] {
  const { dir: pagesDir } = pagesDirOptions
  const {
    nuxtStyle,
    extensionsRE,
  } = options

  const routes: Route[] = []

  for (const filePath of filesPath) {
    const resolvedPath = filePath.replace(extensionsRE, '')
    const pathNodes = resolvedPath.split('/')

    const component = `/${pagesDir}/${filePath}`
    const route: Route = {
      name: '',
      path: '',
      component,
    }

    let parentRoutes = routes

    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i]
      const isDynamic = isDynamicRoute(node, nuxtStyle)
      const isCatchAll = isCatchAllRoute(node, nuxtStyle)
      const normalizedPart = (
        isDynamic
          ? nuxtStyle
            ? isCatchAll ? 'all' : node.replace(/^_/, '')
            : node.replace(/^\[(\.{3})?/, '').replace(/\]$/, '')
          : node
      ).toLowerCase()

      route.name += route.name ? `-${normalizedPart}` : normalizedPart

      // Check nested route
      const parent = parentRoutes.find(node => node.name === route.name)

      if (parent) {
        parent.children = parent.children || []
        parentRoutes = parent.children
        route.path = ''
      }
      else if (normalizedPart === 'index' && !route.path) {
        route.path += '/'
      }
      else if (normalizedPart !== 'index') {
        if (isDynamic) {
          route.path += `/:${normalizedPart}`
          // Catch-all route
          if (isCatchAll)
            route.path += '(.*)'
        }
        else {
          route.path += `/${normalizedPart}`
        }
      }
    }

    parentRoutes.push(route)
  }

  const preparedRoutes = prepareRoutes(routes, options, pagesDirOptions)

  return preparedRoutes
}

export function generateClientCode(routes: Route[], options: ResolvedOptions) {
  const { imports, stringRoutes } = stringifyRoutes(routes, options)

  return `${imports.join('\n')}\n\nconst routes = ${stringRoutes}\n\nexport default routes`
}

export function updateRouteFromHMR(content: string, filename: string, routes: Route[], options: ResolvedOptions): boolean {
  const parsed = parseSFC(content)
  const routeBlock = parsed.customBlocks.find(b => b.type === 'route')
  if (routeBlock) {
    const route = findRouteByFilename(routes, filename)

    if (route) {
      const before = Object.assign({}, route)
      const customBlockContent = parseCustomBlock(routeBlock, filename, options)
      debug.hmr('custom block: %O', customBlockContent)
      Object.assign(route, customBlockContent)
      return !deepEqual(before, route)
    }
  }
  return false
}
