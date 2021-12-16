import { PageContext } from '../src/context'

describe('Generate', () => {
  test('Vue routes - async', async() => {
    const ctx = new PageContext({
      dirs: 'examples/vue/src/pages',
      extendRoute(route) {
        if (route.name === 'about')
          route.props = (route: any) => ({ query: route.query.q })
      },
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        expect(routes).toMatchSnapshot('routes')
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  test('Vue routes - sync', async() => {
    const ctx = new PageContext({
      dirs: 'examples/vue/src/pages',
      importMode: 'sync',
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        expect(routes).toMatchSnapshot('routes')
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  test('Nuxt Style Routes', async() => {
    const ctx = new PageContext({
      dirs: 'examples/nuxt-style/src/pages',
      nuxtStyle: true,
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        expect(routes).toMatchSnapshot('routes')
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })

  test('React routes', async() => {
    const ctx = new PageContext({
      dirs: 'examples/react/src/pages',
      resolver: 'react',
      onRoutesGenerated(routes) {
        // eslint-disable-next-line no-console
        expect(routes).toMatchSnapshot('routes')
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('client code')
  })
})
