import { describe, expect, test } from 'vitest'
import { PageContext } from '../src/context'

function deepSortArray(arr: any[], react?: boolean) {
  const key = react ? 'element' : 'component'
  return arr.sort((a, b) => {
    if (a.children)
      a.children = deepSortArray(a.children)
    return a[key] ? a[key].localeCompare(b[key]) : 0
  })
}

describe('Generate routes', () => {
  test('vue - async mode should match snapshot', async() => {
    const ctx = new PageContext({
      dirs: 'examples/vue/src/pages',
      extendRoute(route) {
        if (route.name === 'about')
          route.props = (route: any) => ({ query: route.query.q })
      },
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        routes = deepSortArray(routes)
        expect(routes).toMatchSnapshot('routes')
        return routes
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  test('vue - sync mode should match snapshot', async() => {
    const ctx = new PageContext({
      dirs: 'examples/vue/src/pages',
      importMode: 'sync',
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        routes = deepSortArray(routes)
        expect(routes).toMatchSnapshot('routes')
        return routes
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  test('vue - nuxt style mode should match snapshot', async() => {
    const ctx = new PageContext({
      dirs: 'examples/nuxt-style/src/pages',
      nuxtStyle: true,
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        routes = deepSortArray(routes)
        expect(routes).toMatchSnapshot('routes')
        return routes
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  test('react - should match snapshot', async() => {
    const ctx = new PageContext({
      dirs: 'examples/react/src/pages',
      resolver: 'react',
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        routes = deepSortArray(routes, true)
        expect(routes).toMatchSnapshot('routes')
        return routes
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })
})
