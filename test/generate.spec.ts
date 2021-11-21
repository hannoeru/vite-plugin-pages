import { PageContext } from '../src/context'

describe('Generate', () => {
  test('Vue routes - async', async() => {
    const ctx = new PageContext({
      dirs: 'examples/vue/src/pages',
      extendRoute(route) {
        if (route.name === 'about')
          route.props = (route: any) => ({ query: route.query.q })
      },
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('vue routes')
  })

  test('Vue routes - sync', async() => {
    const ctx = new PageContext({
      dirs: 'examples/vue/src/pages',
      importMode: 'sync',
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('vue routes - sync')
  })

  test('Nuxt Style Routes', async() => {
    const ctx = new PageContext({
      dirs: 'examples/nuxt-style/src/pages',
      nuxtStyle: true,
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('nuxt style routes')
  })

  test('React routes', async() => {
    const ctx = new PageContext({
      dirs: 'examples/react/src/pages',
      resolver: 'react',
    })
    await ctx.searchGlob()
    const routes = await ctx.resolveRoutes()

    expect(routes).toMatchSnapshot('react routes')
  })
})
