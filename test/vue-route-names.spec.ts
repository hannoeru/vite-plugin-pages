import type { PageOptions } from '../src'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { slash } from '@antfu/utils'
import { createServer } from 'vite'
import { createMemoryHistory, createRouter } from 'vue-router'
import pagesPlugin, { PageContext } from '../src'

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

async function getRoutes(files: Record<string, string>, options: Partial<PageOptions> = {}) {
  const root = createProject(files)
  const ctx = new PageContext({ dirs: 'src/pages', ...options }, root)
  await ctx.searchGlob()
  return await ctx.options.resolver.getComputedRoutes(ctx) as any[]
}

describe('duplicate Vue route names', () => {
  it.each([
    ['about-us.vue', 'about/us.vue', 'about-us'],
    ['id.vue', '[id].vue', 'id'],
    ['users/id.vue', 'users/[id].vue', 'users-id'],
    ['all.vue', '[...all].vue', 'all'],
  ])('rejects %s beside %s', async (first, second, name) => {
    const error = await getRoutes({
      [`src/pages/${first}`]: vuePage,
      [`src/pages/${second}`]: vuePage,
    }).catch(error => error)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/^\[vite-plugin-pages\] /)
    expect(error.message).toContain(`"${name}"`)
    expect(error.message).toContain(`/src/pages/${first}`)
    expect(error.message).toContain(`/src/pages/${second}`)
    expect(error.message).toContain('extendRoute')
  })

  it('rejects a duplicate name in nested routes', async () => {
    await expect(getRoutes({
      'src/pages/a.vue': vuePage,
      'src/pages/a/b.vue': vuePage,
      'src/pages/a-b.vue': vuePage,
    })).rejects.toThrow('"a-b"')
  })

  it('rejects a duplicate name set by a route block', async () => {
    await expect(getRoutes({
      'src/pages/a.vue': `${vuePage}\n<route>\n{ "name": "b" }\n</route>\n`,
      'src/pages/b.vue': vuePage,
    })).rejects.toThrow('"b"')
  })

  it('rejects a duplicate name set by extendRoute', async () => {
    await expect(getRoutes({
      'src/pages/a.vue': vuePage,
      'src/pages/b.vue': vuePage,
    }, {
      extendRoute: () => ({ name: 'same' }),
    })).rejects.toThrow('"same"')
  })

  it('accepts a collision that a route block resolves', async () => {
    const routes = await getRoutes({
      'src/pages/about-us.vue': `${vuePage}\n<route>\n{ "name": "about-us-flat" }\n</route>\n`,
      'src/pages/about/us.vue': vuePage,
    })

    expect(routes.map(route => route.name).sort()).toEqual(['about-us', 'about-us-flat'])
  })

  it('accepts a layout that gives its name to its index child', async () => {
    const routes = await getRoutes({
      'src/pages/users.vue': vuePage,
      'src/pages/users/index.vue': vuePage,
    })

    expect(routes[0].name).toBeUndefined()
    expect(routes[0].children[0].name).toBe('users')
  })

  it('checks names before onRoutesGenerated', async () => {
    const onRoutesGenerated = vi.fn()

    await expect(getRoutes({
      'src/pages/id.vue': vuePage,
      'src/pages/[id].vue': vuePage,
    }, { onRoutesGenerated })).rejects.toThrow('"id"')
    expect(onRoutesGenerated).not.toHaveBeenCalled()
  })
})

describe('vue parameter names', () => {
  it.each([
    { page: 'users/[user-id].vue', param: 'user-id' },
    { page: '[...not-found].vue', param: 'not-found' },
    { page: '[...].vue', param: '' },
    { page: 'users/_user-id.vue', param: 'user-id', routeStyle: 'nuxt' as const },
    { page: 'a/_user.id/b.vue', param: 'user.id', routeStyle: 'nuxt' as const },
  ])('rejects $page', async ({ page, param, routeStyle }) => {
    const error = await getRoutes({ [`src/pages/${page}`]: vuePage }, { routeStyle }).catch(error => error)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/^\[vite-plugin-pages\] /)
    expect(error.message).toContain(`/src/pages/${page}`)
    expect(error.message).toContain(`"${param}"`)
    expect(error.message).toContain('letters, digits, and underscores')
  })

  it.each([
    {
      page: 'users/[user_id2].vue',
      path: '/users/abc',
      params: { user_id2: 'abc' },
    },
    {
      page: '[...all].vue',
      path: '/a/b',
      params: {
        all: ['a', 'b'],
      },
    },
    {
      page: 'users/_user_id.vue',
      path: '/users/abc',
      params: { user_id: 'abc' },
      routeStyle: 'nuxt' as const,
    },
    {
      page: '_.vue',
      path: '/a/b',
      params: {
        all: ['a', 'b'],
      },
      routeStyle: 'nuxt' as const,
    },
  ])('accepts $page in vue-router', async ({ page, path, params, routeStyle }) => {
    const routes = await getRoutes({ [`src/pages/${page}`]: vuePage }, { routeStyle })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: routes.map(route => ({ ...route, component: {} })),
    })

    expect(router.resolve(path).params).toEqual(params)
  })
})

describe('route name error in the dev server', () => {
  it('fails the ~pages request and recovers after a fix', async () => {
    const root = createProject({
      'src/pages/id.vue': vuePage,
      'src/pages/[id].vue': vuePage,
      'main.js': 'import routes from "~pages"\nconsole.log(routes)\n',
    })
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [
        pagesPlugin(),
      ],
      server: { watch: null },
    })
    onTestFinished(() => server.close())
    await server.listen()
    const origin = server.resolvedUrls!.local[0]
    const main = await (await fetch(new URL('main.js', origin))).text()
    const moduleUrl = new URL(main.match(/from "([^"]+)"/)![1], origin)
    const loadRoutes = async () => {
      const response = await fetch(moduleUrl)
      return `${response.status} ${await response.text()}`
    }

    const failed = await loadRoutes()
    expect(failed).toMatch(/^500 /)
    expect(failed).toContain('Duplicate route name')

    unlinkSync(join(root, 'src/pages/id.vue'))
    server.watcher.emit('unlink', `${root}/src/pages/id.vue`)

    await expect.poll(loadRoutes, { timeout: 10_000 }).toMatch(/^200 [\s\S]*"path":"\/:id"/)
  }, 20_000)
})
