import { generateRoutes, generateClientCode } from '../src/generate'
import { resolveOptions } from '../src/index'
import { Route } from '../src/types'

const options = resolveOptions({
  pagesDir: 'test/assets/pages',
})
const nuxtOptions = resolveOptions({
  pagesDir: 'test/assets/nuxt-pages',
  nuxtStyle: true,
})
const files = ['[...all].vue', 'home.vue', 'index.vue', 'user.vue', 'user/[id].vue']
const nuxtFiles = ['_.vue', 'home.vue', 'index.vue', 'user.vue', 'user/_id.vue']
const pageDir = options.pagesDirOptions[0]
const nuxtPageDir = nuxtOptions.pagesDirOptions[0]

const expectRoutes = [
  {
    component: '/test/assets/pages/[...all].vue',
    name: 'all',
    path: '/:all(.*)',
    props: true,
  },
  {
    name: 'home',
    path: '/home',
    component: '/test/assets/pages/home.vue',
    props: true,
  },
  {
    name: 'index',
    path: '/',
    component: '/test/assets/pages/index.vue',
    props: true,
  },
  {
    path: '/user',
    component: '/test/assets/pages/user.vue',
    children: [
      {
        name: 'name-override',
        path: ':id',
        component: '/test/assets/pages/user/[id].vue',
        props: true,
        meta: {
          requiresAuth: false,
        },
      },
    ],
    props: true,
  },
]

describe('Generate', () => {
  let routes: Route[] = []
  test('Routes', () => {
    routes = generateRoutes(files, pageDir, options)
    expect(routes).toMatchSnapshot('routes')
  })
  test('Nuxt Style Routes', () => {
    routes = generateRoutes(nuxtFiles, nuxtPageDir, nuxtOptions)
    expect(routes).toMatchSnapshot('nuxt style routes')
  })
  test('Client Code', () => {
    const code = generateClientCode(expectRoutes, options)
    expect(code).toMatchSnapshot('client code')
  })
})
