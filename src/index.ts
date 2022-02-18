import { MODULE_IDS, MODULE_ID_VIRTUAL } from './constants'
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
      await ctx.searchGlob()
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
      if (!/vue&type=route/.test(id)) return
      return {
        code: id.endsWith('lang.json') ? '{}' : 'export default {};',
        map: null,
      }
    },
  }
}

export * from './types'
export { PageContext }
export default pagesPlugin
