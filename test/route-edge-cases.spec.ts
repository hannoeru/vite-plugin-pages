import type { Plugin } from 'vite'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { slash } from '@antfu/utils'
import { build, resolveConfig } from 'vite'
import pagesPlugin, { PageContext, syncIndexResolver } from '../src'
import { resolveOptions } from '../src/options'

const vuePage = '<template><div /></template>'

function createProject(files: Record<string, string>) {
  const base = slash(realpathSync(mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))))
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

  it('makes the root index sync with absolute import paths', () => {
    const { root, options } = createOptions()

    expect(syncIndexResolver(`${root}/src/pages/index.vue`, options)).toBe('sync')
    expect(syncIndexResolver(`${root}/src/pages/index-card.vue`, options)).toBe('async')
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
