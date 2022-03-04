import { MODULE_IDS, MODULE_ID_VIRTUAL, ROUTE_BLOCK_ID_VIRTUAL, routeBlockQueryRE } from './constants'
import { PageContext } from './context'

import type { UserOptions } from './types'
import type { Plugin } from 'vite'

function pagesPlugin(userOptions: UserOptions = {}): Plugin {
  let ctx: PageContext

  return {
    name: 'vite-plugin-pages',
    enforce: 'pre',
    async configResolved(config) {
      // auto set resolver for react project
      if (
        !userOptions.resolver
        && config.plugins.find(i => i.name.includes('vite:react'))
      )
        userOptions.resolver = 'react'

      // TODO: auto set resolver for solid project
      if (
        !userOptions.resolver
        && config.plugins.find(i => i.name.includes('solid'))
      )
        userOptions.resolver = 'solid'

      ctx = new PageContext(userOptions, config.root)
      ctx.setLogger(config.logger)
      await ctx.searchGlob()
    },
    configureServer(server) {
      ctx.setupViteServer(server)
    },
    resolveId(id) {
      if (MODULE_IDS.includes(id))
        return MODULE_ID_VIRTUAL

      if (routeBlockQueryRE.test(id))
        return ROUTE_BLOCK_ID_VIRTUAL

      return null
    },
    async load(id) {
      if (id === MODULE_ID_VIRTUAL)
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

export * from './types'
export {
  VueRoute,
  ReactRoute,
  SolidRoute,
} from './resolvers'
export { PageContext }
export default pagesPlugin
