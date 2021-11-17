import { PageContext } from '../src/context'

describe('Generate', () => {
  test('Routes', async() => {
    const ctx = new PageContext({
      pages: 'test/assets/pages',
      extendRoute(route) {
        if (route.name === 'about')
          route.props = (route: any) => ({ query: route.query.q })
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('routes')
  })

  test('Nuxt Style Routes', async() => {
    const ctx = new PageContext({
      pages: 'test/assets/nuxt-pages',
      nuxtStyle: true,
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('nuxt style routes')
  })
})
