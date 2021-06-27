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

function sortRoutes(a: any, b: any) {
  const fa = a.name
  const fb = b.name

  if (fa < fb)
    return -1

  if (fa > fb)
    return 1

  return 0
}

describe('Generate', () => {
  let routes: Route[] = []
  let nuxtRoutes: Route[] = []
  const pages = resolvePages(options)
  const nuxtPages = resolvePages(nuxtOptions)

  test('Pages', () => {
    expect(pages.values().next().value).toMatchSnapshot({
      filepath: expect.any(String),
    }, 'pages')
  })
  test('Routes', () => {
    routes = generateRoutes(pages, options)
    expect(routes.sort(sortRoutes)).toMatchSnapshot('routes')
  })

  test('Nuxt Style Pages', () => {
    expect(nuxtPages.values().next().value).toMatchSnapshot({
      filepath: expect.any(String),
    }, 'nuxt style pages')
  })
  test('Nuxt Style Routes', () => {
    nuxtRoutes = generateRoutes(nuxtPages, nuxtOptions)
    expect(nuxtRoutes.sort(sortRoutes)).toMatchSnapshot('nuxt style routes')
  })

  test('Client Code', () => {
    const code = generateClientCode(routes, options)
    expect(code).toMatchSnapshot('client code')
  })
})
