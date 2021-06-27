import { generateRoutes, generateClientCode } from '../src/generate'
import { resolvePages } from '../src/pages'
import { resolveOptions } from '../src/options'
import { Route } from '../src/types'

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
  let routes: Route[] = []
  let nuxtRoutes: Route[] = []
  const pages = resolvePages(options)
  const nuxtPages = resolvePages(nuxtOptions)

  test('Routes', () => {
    routes = generateRoutes(pages, options)
    expect(routes).toMatchSnapshot('routes')
  })
  test('Nuxt Style Routes', () => {
    nuxtRoutes = generateRoutes(nuxtPages, nuxtOptions)
    expect(nuxtRoutes).toMatchSnapshot('nuxt style routes')
  })

  test('Client Code', () => {
    const code = generateClientCode(routes, options)
    expect(code).toMatchSnapshot('client code')
  })
})
