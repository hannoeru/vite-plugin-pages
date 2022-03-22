import { describe, expect, test } from 'vitest'
import { PageContext } from '../src/context'
import { ContextRunner } from '../src/contextRunner'

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
  test('vue - async mode match snapshot', async() => {
    const ctx = new ContextRunner({
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
    }, new PageContext())
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  test('vue - sync mode match snapshot', async() => {
    const ctx = new ContextRunner({
      dirs: 'examples/vue/src/pages',
      importMode: 'sync',
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        routes = deepSortArray(routes)
        expect(routes).toMatchSnapshot('routes')
        return routes
      },
    }, new PageContext())
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  test('react - match snapshot', async() => {
    const ctx = new ContextRunner({
      dirs: 'examples/react/src/pages',
      resolver: 'react',
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        routes = deepSortArray(routes, true)
        expect(routes).toMatchSnapshot('routes')
        return routes
      },
    }, new PageContext())
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  test('solid - match snapshot', async() => {
    const ctx = new ContextRunner({
      dirs: 'examples/solid/src/pages',
      resolver: 'solid',
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        routes = deepSortArray(routes, true)
        expect(routes).toMatchSnapshot('routes')
        return routes
      },
    }, new PageContext())
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  describe('routeStyle', () => {
    test('nuxt style match snapshot', async() => {
      const ctx = new ContextRunner({
        dirs: 'examples/nuxt-style/src/pages',
        routeStyle: 'nuxt',
        onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
          routes = deepSortArray(routes)
          expect(routes).toMatchSnapshot('routes')
          return routes
        },
      }, new PageContext())
      await ctx.searchGlob()
      const routes = await ctx.resolveRoutes()

      expect(routes).toMatchSnapshot('client code')
    })

    test('remix Style match snapshot', async() => {
      const ctx = new ContextRunner({
        dirs: 'examples/remix-style/src/pages',
        routeStyle: 'remix',
        resolver: 'react',
        onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
          routes = deepSortArray(routes, true)
          expect(routes).toMatchSnapshot('routes')
          return routes
        },
      }, new PageContext())
      await ctx.searchGlob()
      const routes = await ctx.resolveRoutes()

      expect(routes).toMatchSnapshot('client code')
    })
  })
})
