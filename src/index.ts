import { MODULE_IDS, MODULE_ID_VIRTUAL, routeBlockQueryRE } from './constants'
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

      // hijack vite json plugin to avoid tranform custom block
      const jsonPlugin = config.plugins.find(p => p.name === 'vite:json')
      if (jsonPlugin) {
        const jsonTransform = jsonPlugin.transform // backup @rollup/plugin-json
        jsonPlugin.transform = async function(code: string, id: string) {
          if (routeBlockQueryRE.test(id))
            return

          return jsonTransform!.apply(this, [code, id])
        }
      }
    },
    configureServer(server) {
      ctx.setupViteServer(server)
    },
    resolveId(id) {
      return MODULE_IDS.includes(id) ? MODULE_ID_VIRTUAL : null
    },
    async load(id) {
      if (id !== MODULE_ID_VIRTUAL)
        return

      return ctx.resolveRoutes()
    },
    async transform(_code, id) {
      if (!routeBlockQueryRE.test(id)) return
      return {
        code: 'export default {};',
        map: null,
      }
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
