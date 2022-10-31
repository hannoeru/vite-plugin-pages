import colors from 'picocolors'
import deepEqual from 'deep-equal'
import { compileScript, parse } from '@vue/compiler-sfc'
import MagicString from 'magic-string'
import {
  countSlash,
  isCatchAllRoute,
  isDynamicRoute,
  normalizeCase,
  normalizeName,
} from '../utils'
import { generateClientCode } from '../stringify'

import { getRouteBlock } from '../customBlock'
import type { CustomBlock, Optional, PageResolver } from '../types'
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

    if (route.children)
      route.children = prepareRoutes(ctx, route.children, route)

    if (route.children?.find(c => c.name === route.name))
      delete route.name

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

async function computeVueRoutes(ctx: PageContext, customBlockMap: Map<string, CustomBlock>): Promise<VueRoute[]> {
  const { routeStyle, caseSensitive, routeNameSeparator } = ctx.options

  const pageRoutes = [...ctx.pageRouteMap.values()]
    // sort routes for HMR
    .sort((a, b) => countSlash(a.route) - countSlash(b.route))

  const routes: VueRouteBase[] = []

  pageRoutes.forEach((page) => {
    const pathNodes = page.route.split('/')

    // add leading slash to component path if not already there
    const component = page.path.replace(ctx.root, '')
    const customBlock = customBlockMap.get(page.path)

    const route: VueRouteBase = {
      name: '',
      path: '',
      component,
      customBlock,
      rawRoute: page.route,
    }

    let parentRoutes = routes
    let dynamicRoute = false

    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i]
      const nuxtStyle = routeStyle === 'nuxt'
      const isDynamic = isDynamicRoute(node, nuxtStyle)
      const isCatchAll = isCatchAllRoute(node, nuxtStyle)
      const normalizedName = normalizeName(node, isDynamic, nuxtStyle)
      const normalizedPath = normalizeCase(normalizedName, caseSensitive)

      if (isDynamic)
        dynamicRoute = true

      page.name = route.name += route.name ? `${routeNameSeparator}${normalizedName}` : normalizedName

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
          } else if (nuxtStyle && i === pathNodes.length - 1) {
            // we need to search if the folder provide `index.vue`
            const isIndexFound = pageRoutes.find(({ route }) => {
              return route === page.route.replace(pathNodes[i], 'index')
            })
            if (!isIndexFound) route.path += '?'
          }
        } else {
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

  finalRoutes = (await ctx.options.onRoutesGenerated?.(finalRoutes)) || finalRoutes

  return finalRoutes
}

async function resolveVueRoutes(ctx: PageContext, customBlockMap: Map<string, CustomBlock>) {
  const finalRoutes = await computeVueRoutes(ctx, customBlockMap)

  let client = generateClientCode(finalRoutes, ctx.options)
  client = (await ctx.options.onClientGenerated?.(client)) || client
  return client
}

async function transform(ctx: PageContext, code: string, id: string) {
  if (!/\.vue$/.test(id))
    return
  const name = ctx.pageRouteMap.get(id)?.name
  if (!name)
    return
  const { descriptor } = parse(code)
  if (!descriptor.scriptSetup)
    return
  const result = compileScript(descriptor, { id })
  if (result.scriptAst?.find(i => i.type === 'ExportDefaultDeclaration'))
    return

  const s = new MagicString(code)
  const lang = result.attrs.lang
  s.appendLeft(
    0,
`<script ${lang ? `lang="${lang}"` : ''}>
import { defineComponent } from 'vue'
export default /*#__PURE__*/ defineComponent({
name: '${name}',
})
</script>\n`,
  )
  return {
    map: s.generateMap(),
    code: s.toString(),
  }
}

export function vueResolver(): PageResolver {
  const customBlockMap = new Map<string, CustomBlock>()

  async function checkCustomBlockChange(ctx: PageContext, path: string) {
    const exitsCustomBlock = customBlockMap.get(path)
    let customBlock: CustomBlock | undefined
    try {
      customBlock = await getRouteBlock(path, ctx.options)
    } catch (error: any) {
      ctx.logger?.error(colors.red(`[vite-plugin-pages] ${error.message}`))
      return
    }
    if (!exitsCustomBlock && !customBlock)
      return

    if (!customBlock) {
      customBlockMap.delete(path)
      ctx.debug.routeBlock('%s deleted', path)
      return
    }
    if (!exitsCustomBlock || !deepEqual(exitsCustomBlock, customBlock)) {
      ctx.debug.routeBlock('%s old: %O', path, exitsCustomBlock)
      ctx.debug.routeBlock('%s new: %O', path, customBlock)
      customBlockMap.set(path, customBlock)
      ctx.onUpdate()
    }
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
      added: async(ctx, path) => checkCustomBlockChange(ctx, path),
      changed: async(ctx, path) => checkCustomBlockChange(ctx, path),
      removed: async(_ctx, path) => {
        customBlockMap.delete(path)
      },
    },
    transform,
  }
}
