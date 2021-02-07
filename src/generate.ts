/**
 * https://github.com/brattonross/vite-plugin-voie/blob/main/packages/vite-plugin-voie/src/routes.ts
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file at
 * https://github.com/brattonross/vite-plugin-voie/blob/main/LICENSE
 */

import * as fs from 'fs'
import deepEqual from 'deep-equal'
import { Route, ResolvedOptions } from './types'
import { debug, isDynamicRoute } from './utils'
import { stringifyRoutes } from './stringify'
import { tryParseCustomBlock, parseSFC } from './parseSfc'

function prepareRoutes(
  routes: Route[],
  options: ResolvedOptions,
  parent?: Route,
) {
  for (const route of routes) {
    if (route.name)
      route.name = route.name.replace(/-index$/, '')

    if (parent)
      route.path = route.path.replace(/^\//, '').replace(/\?$/, '')

    route.props = true

    if (route.children) {
      delete route.name
      route.children = prepareRoutes(route.children, options, route)
    }

    if (typeof options.extendRoute === 'function')
      Object.assign(route, options.extendRoute(route, parent) || {})
  }
  return routes
}

function findRouteByFilename(routes: Route[], filename: string): Route | undefined {
  let result = routes.find(x => x.filename === filename)
  if (result === undefined) {
    for (const route of routes) {
      if (route.children !== undefined) result = findRouteByFilename(route.children, filename)
      if (result) break
    }
  }
  return result
}

export function generateRoutes(filesPath: string[], options: ResolvedOptions): Route[] {
  const {
    pagesDir,
    pagesDirPath,
    extensions,
  } = options
  const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`)

  const routes: Route[] = []

  for (const filePath of filesPath) {
    const resolvedPath = filePath.replace(extensionsRE, '')
    const pathNodes = resolvedPath.split('/')

    const component = `/${pagesDir}/${filePath}`
    const route: Route = {
      name: '',
      path: '',
      filename: '',
      component,
    }

    let parentRoutes = routes

    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i]
      const isDynamic = isDynamicRoute(node)
      const isLastOne = i === pathNodes.length - 1
      const normalizedPart = (isDynamic
        ? node.replace(/^\[(\.{3})?/, '').replace(/\]$/, '')
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
          if (/^\[\.{3}/.test(node))
            route.path += '(.*)'
          else if (isLastOne)
            route.path += '?'
        }
        else {
          route.path += `/${normalizedPart}`
        }
      }
    }

    route.filename = `${pagesDirPath}/${filePath}`
    const content = fs.readFileSync(route.filename, 'utf8')
    const parsed = parseSFC(content)
    const routeBlock = parsed.customBlocks.find(b => b.type === 'route')

    if (routeBlock)
      Object.assign(route, tryParseCustomBlock(routeBlock, filePath))

    parentRoutes.push(route)
  }

  const preparedRoutes = prepareRoutes(routes, options)

  return preparedRoutes
}

export function generateClientCode(filesPath: string[], options: ResolvedOptions) {
  const routes = generateRoutes(filesPath, options)
  const { imports, stringRoutes } = stringifyRoutes(routes, options)

  return `${imports.join('\n')}\n\nconst routes = ${stringRoutes}\n\nexport default routes`
}

export function generateClientCodeFromRoutes(routes: Route[], options: ResolvedOptions) {
  const { imports, stringRoutes } = stringifyRoutes(routes, options)

  return `${imports.join('\n')}\n\nconst routes = ${stringRoutes}\n\nexport default routes`
}

export function updateRouteFromContent(content: string, filename: string, routes: Route[]): boolean {
  const parsed = parseSFC(content)
  const routeBlock = parsed.customBlocks.find(b => b.type === 'route')
  if (routeBlock) {
    debug('hmr block: %O', routeBlock)
    const route = findRouteByFilename(routes, filename)

    if (route) {
      const before = Object.assign({}, route)
      Object.assign(route, tryParseCustomBlock(routeBlock, filename))
      return !deepEqual(before, route)
    }
  }
  return false
}
