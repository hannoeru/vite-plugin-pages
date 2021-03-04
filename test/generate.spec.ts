import { generateRoutes, generateClientCode } from '../src/generate'
import { resolveOptions } from '../src/index'
import { Route } from '../src/types'

const options = resolveOptions({
  pagesDir: 'test/pages',
})
const files = ['home.vue', 'index.vue', 'user.vue', 'user/[id].vue']
const pageDir = options.pagesDirOptions[0]

const expectRoutes = [
  {
    name: 'home',
    path: '/home',
    component: '/test/pages/home.vue',
    props: true,
  },
  {
    name: 'index',
    path: '/',
    component: '/test/pages/index.vue',
    props: true,
  },
  {
    path: '/user',
    component: '/test/pages/user.vue',
    children: [
      {
        name: 'name-override',
        path: ':id',
        component: '/test/pages/user/[id].vue',
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
    expect(routes).toStrictEqual(expectRoutes)
  })
  test('Client Code', () => {
    const code = generateClientCode(expectRoutes, options)
    expect(code).toMatchSnapshot()
  })
})
