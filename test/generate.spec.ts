import { generateRoutes, generateClientCode } from '../src/generate'
import { resolvePages } from '../src/pages'
import { resolveOptions } from '../src/options'

const options = resolveOptions({
  pagesDir: 'test/assets/pages',
  extendRoute(route) {
    if (route.name === 'about')
      route.props = route => ({ query: route.query.q })
  },
})
const nuxtOptions = resolveOptions({
  pagesDir: 'test/assets/nuxt-pages',
  nuxtStyle: true,
})

describe('Generate', () => {
  test('Routes', async() => {
    const pages = await resolvePages(options)
    const routes = generateRoutes(pages, options)
    const code = generateClientCode(routes, options)

    expect(routes).toMatchSnapshot('routes')
    expect(code).toMatchSnapshot('client code')
  })

  test('Nuxt Style Routes', async() => {
    const pages = await resolvePages(nuxtOptions)
    const routes = generateRoutes(pages, nuxtOptions)
    const code = generateClientCode(routes, options)

    expect(routes).toMatchSnapshot('nuxt style routes')
    expect(code).toMatchSnapshot('nuxt style client code')
  })
})
