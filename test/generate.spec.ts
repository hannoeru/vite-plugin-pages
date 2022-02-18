import { describe, expect, test } from 'vitest'
import { PageContext } from '../src/context'

const sensitivity = process.platform === 'win32' ? 'base' : 'variant'

function deepSortArray(arr: any[], react?: boolean) {
  const key = react ? 'element' : 'component'
  arr.forEach((i) => {
    if (i.children)
      i.children = deepSortArray(i.children, react)
  })
  if (arr.length === 1) return arr
  return arr.sort((a, b) => {
    return a[key] && b[key] ? a[key].localeCompare(b[key], 'en', { sensitivity }) : !(a[key] && b[key]) ? 0 : a[key] ? 1 : -1
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

  test('solid - should match snapshot', async() => {
    const ctx = new PageContext({
      dirs: 'examples/solid/src/pages',
      resolver: 'solid',
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

  describe('routeStyle', () => {
    test('nuxt style should match snapshot', async() => {
      const ctx = new PageContext({
        dirs: 'examples/nuxt-style/src/pages',
        routeStyle: 'nuxt',
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

    test('remix style should match snapshot', async() => {
      const ctx = new PageContext({
        dirs: 'examples/remix-style/src/pages',
        routeStyle: 'remix',
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
})
