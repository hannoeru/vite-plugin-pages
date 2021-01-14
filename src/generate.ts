/**
 * https://github.com/brattonross/vite-plugin-voie/blob/main/packages/vite-plugin-voie/src/routes.ts
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file at
 * https://github.com/brattonross/vite-plugin-voie/blob/main/LICENSE
 */

import { resolve, parse, join } from 'path'
import fg from 'fast-glob'
import chalk from 'chalk'
import { Route, Options } from './types'
import {
  normalizePath,
  debug,
  isDynamicRoute,
  resolveImportMode,
  pathToName,
} from './utils'
import { stringifyRoutes } from './stringify'

function prepareRoutes(
  routes: Route[],
  options: Options,
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

export function generateRoutes(filesPath: string[], options: Options): string {
  const {
    root,
    pagesDir,
    extensions,
    exclude,
  } = options
  const cwd = normalizePath(resolve(root, pagesDir))
  const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`)

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
    parentRoutes.push(route)
  }

  const preparedRoutes = prepareRoutes(routes, options)

  return preparedRoutes
}

export function generateClientCode(filesPath: string[], options: Options) {
  const routes = generateRoutes(filesPath, options)
  const { imports, stringRoutes } = stringifyRoutes(routes, options)

  return `${imports.join('\n')}\n\nconst routes = ${stringRoutes}\n\nexport default routes`
}
