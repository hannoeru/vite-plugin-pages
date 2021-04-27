import { generateRoutes, generateClientCode } from '../src/generate'
import { resolveOptions } from '../src/options'
import { Route } from '../src/types'

const options = resolveOptions({
  pagesDir: 'test/assets/pages',
  extensions: ['vue', 'tsx'],
  extendRoute(route) {
    if (route.name === 'about')
      route.props = route => ({ query: route.query.q })
  },
})
const nuxtOptions = resolveOptions({
  pagesDir: 'test/assets/nuxt-pages',
  nuxtStyle: true,
})
const files = ['[...all].vue', 'about.vue', 'components.vue', 'index.vue', '[sensor]/current.vue', 'about/index.vue', 'blog/[id].vue', 'blog/index.vue', 'blog/today/index.vue', '[userId].tsx']
const nuxtFiles = ['_.vue', 'about.vue', 'components.vue', 'index.vue', '_sensor/current.vue', 'about/index.vue', 'blog/_id.vue', 'blog/index.vue', 'blog/today/index.vue', '[userId].tsx']
const pageDir = options.pagesDirOptions[0]
const nuxtPageDir = nuxtOptions.pagesDirOptions[0]

describe('Generate', () => {
  let routes: Route[] = []
  let nuxtRoutes: Route[] = []
  test('Routes', () => {
    routes = generateRoutes(files, pageDir, options)
    expect(routes).toMatchSnapshot('routes')
  })
  test('Nuxt Style Routes', () => {
    nuxtRoutes = generateRoutes(nuxtFiles, nuxtPageDir, nuxtOptions)
    expect(nuxtRoutes).toMatchSnapshot('nuxt style routes')
  })
  test('Client Code', () => {
    const code = generateClientCode(routes, options)
    expect(code).toMatchSnapshot('client code')
  })
})
