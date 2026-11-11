import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { slash } from '@antfu/utils'
import { build, parseAst } from 'vite'
import { createMemoryHistory, createRouter } from 'vue-router'
import pagesPlugin from '../src'
import { resolveOptions } from '../src/options'
import { generateClientCode, stringifyRoutes } from '../src/stringify'

function createProject(files: Record<string, string>) {
  const base = slash(realpathSync.native(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))))
  onTestFinished(() => rmSync(base, { recursive: true, force: true }))

  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(base, file)), { recursive: true })
    writeFileSync(join(base, file), content)
  }

  return base
}

async function buildRoutes(files: Record<string, string>) {
  const root = createProject({
    ...files,
    'main.js': 'import routes from "~pages"\nconsole.log(routes)\n',
  })

  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      pagesPlugin(),
      {
        name: 'vue-stub',
        transform: (code, id) => id.endsWith('.vue')
          ? {
              code: code.replace(/<route>[\s\S]*<\/route>/, '').replace(/<\/?script>/g, ''),
              moduleType: 'js',
            }
          : undefined,
      },
    ],
    build: {
      write: false,
      minify: false,
      rollupOptions: { input: `${root}/main.js` },
    },
  })

  return (result as any).output[0].code as string
}

function evaluateRoutes(routes: any[]) {
  const { stringRoutes } = stringifyRoutes(routes, resolveOptions({}))
  return runInNewContext(`(${stringRoutes})`, {
    __pages_import_0__: {
      render: () => null,
    },
  })
}

describe('stringify routes', () => {
  it.each(['props', 'beforeEnter'])('preserves source text in %s functions', (key) => {
    const callback = () => ({
      label: 'hello world',
      url: 'https://example.com',
      comment: '/* keep this */',
      escaped: '"quoted" \\path\nnext line',
      replacement: '$& $$ $` $\'',
    })
    const routes = evaluateRoutes([
      { [key]: callback },
    ])

    expect(routes[0][key]()).toEqual({
      label: 'hello world',
      url: 'https://example.com',
      comment: '/* keep this */',
      escaped: '"quoted" \\path\nnext line',
      replacement: '$& $$ $` $\'',
    })
  })

  it('preserves keyword spacing in regular functions', () => {
    const callback = function (route: { params: { id: string } }) {
      return route.params.id
    }
    const routes = evaluateRoutes([
      { props: callback },
    ])

    expect(routes[0].props({
      params: { id: '42' },
    })).toBe('42')
  })

  it('emits redirect functions and beforeEnter arrays as working code', async () => {
    const routes = evaluateRoutes([
      {
        path: '/old',
        redirect: () => ({ path: '/new' }),
      },
      {
        path: '/new',
        component: '/src/pages/index.vue',
        beforeEnter: [
          (to: any) => { to.meta.first = true },
          (to: any) => { to.meta.second = true },
        ],
      },
    ])
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })

    await router.push('/old')

    expect(router.currentRoute.value.path).toBe('/new')
    expect(router.currentRoute.value.meta).toMatchObject({ first: true, second: true })
  })

  it('emits functions in meta as working code', () => {
    const routes = evaluateRoutes([
      {
        path: '/',
        meta: {
          title: {
            get: (name: string) => `Hello ${name}`,
          },
          list: [
            () => 1,
          ],
        },
      },
    ])

    expect(routes[0].meta.title.get('you')).toBe('Hello you')
    expect(routes[0].meta.list[0]()).toBe(1)
  })

  it('leaves out undefined properties', () => {
    const { stringRoutes } = stringifyRoutes([
      {
        path: '/',
        name: undefined,
        meta: {
          a: undefined,
          b: [undefined],
        },
      },
    ], resolveOptions({}))

    expect(stringRoutes).toBe(JSON.stringify([
      {
        path: '/',
        name: undefined,
        meta: {
          a: undefined,
          b: [undefined],
        },
      },
    ]))
  })

  it('throws for method shorthand and names the route and key', () => {
    const route = {
      path: '/about',
      meta: {
        load() { return 1 },
      },
    }

    expect(() => stringifyRoutes([route], resolveOptions({})))
      .toThrowError(/"load".*"\/about"/)
  })

  it('keeps component keys in route data as strings', async () => {
    const code = await buildRoutes({
      'src/pages/index.vue': '<script>export default {}</script>\n<route>\n{ meta: { component: "Hero", nested: [{ element: "Card" }] } }\n</route>\n',
    })

    expect(code).toMatch(/"component": "Hero"/)
    expect(code).toMatch(/"element": "Card"/)
  })

  it.skipIf(process.platform === 'win32')('builds with a quote in a page file name', async () => {
    const code = await buildRoutes({
      'src/pages/index.vue': '<script>export default {}</script>',
      'src/pages/say-"hi".vue': '<script>export default { name: "quoted" }</script>',
    })

    expect(code).toContain('"path": "/say-\\"hi\\""')
  })

  it.each(['react', 'solid'] as const)('quotes import paths for the %s resolver', (resolver) => {
    const code = generateClientCode([
      { path: 'say', element: '/src/pages/say-"hi".tsx', component: '/src/pages/say-"hi".tsx' },
    ], resolveOptions({ resolver, importMode: 'async' }))

    expect(() => parseAst(code)).not.toThrow()
    expect(code).toContain('import("/src/pages/say-\\"hi\\".tsx")')
  })

  it('quotes sync import paths', () => {
    const code = generateClientCode([
      { path: '/', component: '/src/pages/say-"hi".vue' },
    ], resolveOptions({ importMode: 'sync' }))

    expect(() => parseAst(code)).not.toThrow()
    expect(code).toContain('from "/src/pages/say-\\"hi\\".vue"')
  })
})
