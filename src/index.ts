import type { HotUpdateOptions, Plugin } from 'vite'
import type { UserOptions } from './types'
import { MODULE_ID_VIRTUAL, ROUTE_BLOCK_ID_VIRTUAL, routeBlockQueryRE } from './constants'

import { PageContext } from './context'
import { debug, invalidatePagesModule, parsePageRequest } from './utils'

interface PendingHotUpdate {
  environments: Set<string>
  routesChanged: Promise<boolean>
}

function pagesPlugin(userOptions: UserOptions = {}): Plugin {
  let ctx: PageContext
  const hotUpdates = new Map<number, PendingHotUpdate>()

  function processHotUpdate(options: HotUpdateOptions) {
    let update = hotUpdates.get(options.timestamp)
    if (!update) {
      update = {
        environments: new Set(),
        routesChanged: ctx.handleFileChange(options.type, options.file),
      }
      hotUpdates.set(options.timestamp, update)
    }
    return update
  }

  return {
    name: 'vite-plugin-pages',
    enforce: 'pre',
    async configResolved(config) {
      // auto set resolver for react project
      if (
        !userOptions.resolver
        && config.plugins.some(i => i.name.includes('vite:react'))
      ) {
        userOptions.resolver = 'react'
      }

      // auto set resolver for solid project
      if (
        !userOptions.resolver
        && config.plugins.some(i => i.name.includes('solid'))
      ) {
        userOptions.resolver = 'solid'
      }

      ctx = new PageContext(userOptions, config.root)
      ctx.setLogger(config.logger)
      await ctx.searchGlob()
    },
    api: {
      getResolvedRoutes() {
        return ctx.options.resolver.getComputedRoutes(ctx)
      },
    },
    async hotUpdate(options) {
      const update = processHotUpdate(options)
      const routesChanged = await update.routesChanged
      update.environments.add(this.environment.name)

      if (update.environments.size === Object.keys(options.server.environments).length)
        hotUpdates.delete(options.timestamp)

      if (!routesChanged)
        return

      invalidatePagesModule(this.environment, options.timestamp)
      debug.hmr(`Reload generated pages in the ${this.environment.name} environment.`)
      this.environment.hot.send({ type: 'full-reload' })
      return []
    },
    resolveId(id) {
      if (ctx.options.moduleIds.includes(id))
        return `${MODULE_ID_VIRTUAL}?id=${id}`

      if (routeBlockQueryRE.test(id))
        return ROUTE_BLOCK_ID_VIRTUAL

      return null
    },
    async load(id) {
      const {
        moduleId,
        pageId,
      } = parsePageRequest(id)

      if (moduleId === MODULE_ID_VIRTUAL && pageId && ctx.options.moduleIds.includes(pageId))
        return ctx.resolveRoutes()

      if (id === ROUTE_BLOCK_ID_VIRTUAL) {
        return {
          code: 'export default {};',
          map: null,
        }
      }

      return null
    },
  }
}

export { syncIndexResolver } from './options'
export type {
  ReactRoute,
  SolidRoute,
  VueRoute,
} from './resolvers'

export {
  reactResolver,
  solidResolver,
  vueResolver,
} from './resolvers'
export * from './types'
export { PageContext }
export default pagesPlugin
