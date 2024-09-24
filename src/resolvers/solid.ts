import type { PageContext } from '../context'
import type { Optional, PageResolver, ResolvedOptions } from '../types'

import { generateClientCode } from '../stringify'
import {
  buildReactRemixRoutePath,
  buildReactRoutePath,
  countSlash,
  normalizeCase,
} from '../utils'

export interface SolidRouteBase {
  rawRoute: string
  path: string
  children?: SolidRouteBase[]
  component?: string
  element?: string
}

export interface SolidRoute extends Omit<Optional<SolidRouteBase, 'rawRoute' | 'path'>, 'children'> {
  children?: SolidRoute[]
}

function prepareRoutes(
  options: ResolvedOptions,
  routes: SolidRoute[],
  parent?: SolidRoute,
) {
  for (const route of routes) {
    if (parent)
      route.path = route.path?.replace(/^\//, '')

    if (route.children)
      route.children = prepareRoutes(options, route.children, route)

    delete route.rawRoute

    Object.assign(route, options.extendRoute?.(route, parent) || {})
  }

  return routes
}

async function computeSolidRoutes(ctx: PageContext): Promise<SolidRoute[]> {
  const { routeStyle, caseSensitive, importPath } = ctx.options
  const nuxtStyle = routeStyle === 'nuxt'

  const pageRoutes = [...ctx.pageRouteMap.values()]
    // sort routes for HMR
    .sort((a, b) => countSlash(a.route) - countSlash(b.route))

  const routes: SolidRouteBase[] = []

  pageRoutes.forEach((page) => {
    const pathNodes = page.route.split('/')

    const component = importPath === 'relative' ? page.path.replace(ctx.root, '') : page.path
    const element = importPath === 'relative' ? page.path.replace(ctx.root, '') : page.path

    let parentRoutes = routes

    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i]
      const normalizedPath = normalizeCase(node, caseSensitive)

      const route: SolidRouteBase = {
        path: '',
        rawRoute: pathNodes.slice(0, i + 1).join('/'),
      }

      // Check parent exists
      const parent = parentRoutes.find(parent =>
        pathNodes.slice(0, i).join('/') === parent.rawRoute,
      )

      if (parent) {
        // Make sure children exist in parent
        parent.children = parent.children || []
        // Append to parent's children
        parentRoutes = parent.children
      }

      if (i === pathNodes.length - 1) {
        route.element = element
        route.component = component
      }

      if (normalizedPath === 'index') {
        if (!route.path)
          route.path = '/'
      }
      else if (normalizedPath !== 'index') {
        if (routeStyle === 'remix')
          route.path = buildReactRemixRoutePath(node) || ''
        else
          route.path = buildReactRoutePath(node, nuxtStyle) || ''
      }

      const exist = parentRoutes.some((parent) => {
        return pathNodes.slice(0, i + 1).join('/') === parent.rawRoute
      })
      if (!exist)
        parentRoutes.push(route)
    }
  })

  // sort by dynamic routes
  let finalRoutes = prepareRoutes(ctx.options, routes)

  finalRoutes = (await ctx.options.onRoutesGenerated?.(finalRoutes)) || finalRoutes

  return finalRoutes
}

async function resolveSolidRoutes(ctx: PageContext) {
  const finalRoutes = await computeSolidRoutes(ctx)
  let client = generateClientCode(finalRoutes, ctx.options)
  client = (await ctx.options.onClientGenerated?.(client)) || client
  return client
}

export function solidResolver(): PageResolver {
  return {
    resolveModuleIds() {
      return ['~solid-pages']
    },
    resolveExtensions() {
      return ['tsx', 'jsx', 'ts', 'js']
    },
    async resolveRoutes(ctx) {
      return resolveSolidRoutes(ctx)
    },
    async getComputedRoutes(ctx) {
      return computeSolidRoutes(ctx)
    },
    stringify: {
      dynamicImport: path => `Solid.lazy(() => import("${path}"))`,
      final: code => `import * as Solid from "solid-js";\n${code}`,
    },
  }
}
