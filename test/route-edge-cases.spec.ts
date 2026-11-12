import type { Plugin } from 'vite'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { slash } from '@antfu/utils'
import { build, createServer, resolveConfig } from 'vite'
import { createMemoryHistory, createRouter } from 'vue-router'
import pagesPlugin, { PageContext, syncIndexResolver } from '../src'
import { resolveOptions } from '../src/options'

const vuePage = '<template><div /></template>'

function createProject(files: Record<string, string>) {
  const base = slash(realpathSync.native(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))))
  onTestFinished(() => rmSync(base, { recursive: true, force: true }))

  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(base, file)), { recursive: true })
    writeFileSync(join(base, file), content)
  }

  return base
}

async function getRoutes(ctx: PageContext) {
  await ctx.searchGlob()
  return await ctx.options.resolver.getComputedRoutes(ctx) as any[]
}

async function resolveAutoDetectedModule(pluginName: string, moduleId: string) {
  const root = createProject({ 'src/pages/index.vue': vuePage })
  const pages = pagesPlugin()
  await resolveConfig({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      pages,
{ name: pluginName } satisfies Plugin,
    ],
  }, 'serve')

  return (pages.resolveId as (id: string) => string | null)(moduleId)
}

describe('page directory beside the project root', () => {
  it.each([
    { resolver: 'vue', page: 'a.vue', key: 'component' },
    { resolver: 'react', page: 'a.tsx', key: 'element' },
    { resolver: 'solid', page: 'a.tsx', key: 'component' },
  ] as const)('keeps the full import path for $resolver', async ({ resolver, page, key }) => {
    const base = createProject({
      [`app-shared/pages/${page}`]: vuePage,
      'app/index.html': '',
    })
    const ctx = new PageContext({ dirs: '../app-shared/pages', resolver }, `${base}/app`)

    const [route] = await getRoutes(ctx)

    expect(route[key]).toBe(`${base}/app-shared/pages/${page}`)
  })

  it('keeps root-relative import paths inside the root', async () => {
    const root = createProject({ 'src/pages/a.vue': vuePage })
    const ctx = new PageContext({ dirs: 'src/pages' }, root)

    const [route] = await getRoutes(ctx)

    expect(route.component).toBe('/src/pages/a.vue')
  })
})

describe('route paths', () => {
  it('removes only the final file extension', async () => {
    const root = createProject({ 'src/pages/v1.vuepress/intro.vue': vuePage })
    const ctx = new PageContext({ dirs: 'src/pages' }, root)

    const [route] = await getRoutes(ctx)

    expect(route.path).toBe('/v1.vuepress/intro')
  })

  it('makes a Vue page named [index] a dynamic route', async () => {
    const root = createProject({ 'src/pages/[index].vue': vuePage })
    const ctx = new PageContext({ dirs: 'src/pages' }, root)

    const [route] = await getRoutes(ctx)

    expect(route.path).toBe('/:index')
  })
})

describe('route names', () => {
  it('keeps a dynamic [index] name apart from its sibling index page', async () => {
    const root = createProject({
      'src/pages/blog/index.vue': vuePage,
      'src/pages/blog/[index].vue': vuePage,
    })
    const ctx = new PageContext({ dirs: 'src/pages' }, root)

    const routes = await getRoutes(ctx)

    expect(Object.fromEntries(routes.map(route => [route.path, route.name]))).toEqual({
      '/blog': 'blog',
      '/blog/:index': 'blog-index',
    })
  })

  it.each([
    { page: '[index].vue', dynamicPath: '/abc' },
    { page: '[index]/index.vue', dynamicPath: '/abc' },
    { page: '[...index].vue', dynamicPath: '/abc/def' },
  ])('keeps the root index reachable beside $page', async ({ page, dynamicPath }) => {
    const root = createProject({
      'src/pages/index.vue': vuePage,
      [`src/pages/${page}`]: vuePage,
    })
    const ctx = new PageContext({ dirs: 'src/pages' }, root)
    const routes = await getRoutes(ctx)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: routes.map(route => ({
        ...route,
        component: { template: route.component },
      })),
    })

    const componentFor = (path: string) => router.resolve(path).matched[0]?.components?.default

    expect(componentFor('/')).toEqual({ template: '/src/pages/index.vue' })
    expect(componentFor(dynamicPath)).toEqual({ template: `/src/pages/${page}` })
  })

  it('keeps a page ending in -index apart from its sibling', async () => {
    const root = createProject({
      'src/pages/my.vue': vuePage,
      'src/pages/my-index.vue': vuePage,
    })
    const ctx = new PageContext({ dirs: 'src/pages' }, root)

    const routes = await getRoutes(ctx)

    expect(routes.map(route => route.name).sort()).toEqual(['my', 'my-index'])
  })

  it.each(['+', '.', '|', '('])('treats the separator %s as literal text', async (routeNameSeparator) => {
    const root = createProject({
      'src/pages/users/index.vue': vuePage,
      'src/pages/blogindex.vue': vuePage,
    })
    const ctx = new PageContext({ dirs: 'src/pages', routeNameSeparator }, root)

    const routes = await getRoutes(ctx)

    expect(routes.map(route => route.name).sort()).toEqual(['blogindex', 'users'])
  })
})

describe('default import mode', () => {
  function createOptions() {
    const root = createProject({ 'src/pages/index.vue': vuePage })
    return {
      root,
      options: resolveOptions({ dirs: 'src/pages' }, root),
    }
  }

  it('makes only the root index file sync', () => {
    const { options } = createOptions()

    expect(syncIndexResolver('/src/pages/index.vue', options)).toBe('sync')
    expect(syncIndexResolver('/src/pages/index-card.vue', options)).toBe('async')
    expect(syncIndexResolver('/src/pages/indexing/a.vue', options)).toBe('async')
    expect(syncIndexResolver('/src/pages/users/index.vue', options)).toBe('async')
  })

  it('uses the same extension as route generation for compound extensions', () => {
    const root = createProject({ 'src/pages/index.vue': vuePage })
    const options = resolveOptions({
      dirs: 'src/pages',
      extensions: ['vue', 'page.vue'],
    }, root)

    expect(syncIndexResolver('/src/pages/index.vue', options)).toBe('sync')
    expect(syncIndexResolver('/src/pages/index.page.vue', options)).toBe('async')
  })

  it('makes the root index sync with absolute import paths', () => {
    const { root, options } = createOptions()

    expect(syncIndexResolver(`${root}/src/pages/index.vue`, options)).toBe('sync')
    expect(syncIndexResolver(`${root}/src/pages/index-card.vue`, options)).toBe('async')
  })

  it.each(['.', './'])('makes the root index sync when dirs is %s', (dirs) => {
    const root = createProject({ 'index.vue': vuePage })
    const options = resolveOptions({ dirs }, root)

    expect(syncIndexResolver('/index.vue', options)).toBe('sync')
    expect(syncIndexResolver(`${root}/index.vue`, options)).toBe('sync')
    expect(syncIndexResolver('/users/index.vue', options)).toBe('async')
  })

  it('makes the root Index file sync when routes ignore case', async () => {
    const root = createProject({ 'src/pages/Index.vue': vuePage })
    const ctx = new PageContext({ dirs: 'src/pages' }, root)

    const [route] = await getRoutes(ctx)

    expect(route.path).toBe('/')
    expect(syncIndexResolver('/src/pages/Index.vue', ctx.options)).toBe('sync')
    expect(syncIndexResolver(`${root}/src/pages/Index.vue`, ctx.options)).toBe('sync')
  })

  it('makes the root Index file async when routes are case sensitive', async () => {
    const root = createProject({ 'src/pages/Index.vue': vuePage })
    const ctx = new PageContext({ dirs: 'src/pages', caseSensitive: true }, root)

    const [route] = await getRoutes(ctx)

    expect(route.path).toBe('/Index')
    expect(syncIndexResolver('/src/pages/Index.vue', ctx.options)).toBe('async')
  })

  it('makes the index file of a page directory outside the root async', () => {
    const base = createProject({
      'shared/pages/index.vue': vuePage,
      'app/index.html': '',
    })
    const options = resolveOptions({ dirs: '../shared/pages' }, `${base}/app`)

    expect(syncIndexResolver(`${base}/shared/pages/index.vue`, options)).toBe('async')
  })

  it('imports the root index directly in client code', async () => {
    const root = createProject({
      'index.vue': vuePage,
      'about.vue': vuePage,
    })
    const ctx = new PageContext({ dirs: '.' }, root)
    await ctx.searchGlob()

    const code = await ctx.resolveRoutes()

    expect(code).toContain('import __pages_import_0__ from "/index.vue"')
    expect(code).toContain('() => import("/about.vue")')
  })
})

describe('solid resolver detection', () => {
  it('ignores other plugins with solid in their name', async () => {
    expect(await resolveAutoDetectedModule('vite-plugin-consolidate', '~pages')).not.toBeNull()
  })

  it('selects solid for vite-plugin-solid', async () => {
    expect(await resolveAutoDetectedModule('solid', '~solid-pages')).not.toBeNull()
  })
})

describe('route comments', () => {
  it('ignores a comment that does not start with route', async () => {
    const root = createProject({
      'src/pages/a.ts': '/*\nauthor: me\n route \nname: replaced\n*/\nexport default {}\n',
    })
    const ctx = new PageContext({ dirs: 'src/pages' }, root)

    const [route] = await getRoutes(ctx)

    expect(route.name).toBe('a')
  })

  it('reads a comment that starts with route', async () => {
    const root = createProject({
      'src/pages/a.ts': '/*\nroute\nname: replaced\n*/\nexport default {}\n',
    })
    const ctx = new PageContext({ dirs: 'src/pages' }, root)

    const [route] = await getRoutes(ctx)

    expect(route.name).toBe('replaced')
  })
})

describe('custom module id', () => {
  it.each([
    '~pages',
    'virtual:generated-pages',
    'virtual:a+b',
    'virtual:a%b',
  ])('serves and reloads %s through the dev server', async (moduleId) => {
    const root = createProject({
      'src/pages/index.vue': vuePage,
      'main.js': `import routes from ${JSON.stringify(moduleId)}\nconsole.log(routes)\n`,
    })
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [
        pagesPlugin({ moduleId }),
      ],
      server: { watch: null },
    })
    onTestFinished(() => server.close())
    await server.listen()
    const origin = server.resolvedUrls!.local[0]
    const main = await (await fetch(new URL('main.js', origin))).text()
    expect(main).toContain('from "')
    const moduleUrl = new URL(main.match(/from "([^"]+)"/)![1], origin)
    const loadRoutes = async () => await (await fetch(moduleUrl)).text()

    expect(await loadRoutes()).toContain('"path":"/"')

    writeFileSync(join(root, 'src/pages/two.vue'), vuePage)
    server.watcher.emit('add', `${root}/src/pages/two.vue`)

    await expect.poll(loadRoutes, { timeout: 10_000 }).toContain('"path":"/two"')
  }, 20_000)

  it('builds with a plus sign in the module id', async () => {
    const root = createProject({
      'src/pages/index.vue': '<script>export default {}</script>',
      'main.js': 'import routes from "virtual:a+b"\nconsole.log(routes)\n',
    })

    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [
        pagesPlugin({ moduleId: 'virtual:a+b' }),
        {
          name: 'vue-stub',
          transform: (code, id) => id.endsWith('.vue')
            ? {
                code: code.replace(/<\/?script>/g, ''),
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

    expect(result).toMatchObject({
      output: [
        {
          code: expect.stringMatching(/path"?:\s*["'`]\/["'`]/),
        },
      ],
    })
  })
})
