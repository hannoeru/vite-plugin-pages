import { resolve } from 'node:path'
import { slash } from '@antfu/utils'
import { resolveOptions } from '../src/options'
import { buildReactRemixRoutePath, buildReactRoutePath, countSlash, extsToGlob, isCatchAllRoute, isDynamicRoute, isTarget } from '../src/utils'

describe('utils', () => {
  it('extensions to glob', () => {
    expect(extsToGlob(['vue', 'ts', 'js'])).toBe('{vue,ts,js}')
  })

  it('is dynamic route', () => {
    expect(isDynamicRoute('[id]')).toBe(true)
    expect(isDynamicRoute('_id', true)).toBe(true)
    expect(isDynamicRoute('me')).toBe(false)
  })

  it('is catch all route', () => {
    expect(isCatchAllRoute('[...all]')).toBe(true)
    expect(isCatchAllRoute('_', true)).toBe(true)
    expect(isCatchAllRoute('[id]')).toBe(false)
    expect(isCatchAllRoute('_id', true)).toBe(false)
  })

  it('count slash', () => {
    expect(countSlash('route')).toBe(0)
    expect(countSlash('user/route/current')).toBe(2)
  })

  // react route path
  it('react route path', () => {
    expect(buildReactRoutePath('index')).toBe('index')
    expect(buildReactRoutePath('[...all]')).toBe('*')
    expect(buildReactRoutePath('[id]')).toBe(':id')
    expect(buildReactRoutePath('normal')).toBe('normal')
  })

  it('remix style route path', () => {
    expect(buildReactRemixRoutePath('root')).toBe('root')
    expect(buildReactRemixRoutePath('about')).toBe('about')
    expect(buildReactRemixRoutePath('__marketing')).toBeUndefined()
    expect(buildReactRemixRoutePath('blog.authors')).toBe('blog/authors')
    expect(buildReactRemixRoutePath('[blog.authors]')).toBe('blog.authors')
    expect(buildReactRemixRoutePath('*')).toBe('*')
  })

  it('path is target', () => {
    const options = resolveOptions({
      dirs: 'examples/vue/src/pages',
      resolver: 'vue',
      exclude: ['**/exclude/**'],
    })

    const testIsTarget = (path: string) => expect(isTarget(slash(resolve(path)), options))

    testIsTarget('examples/vue/src/pages/home.vue').toBe(true)
    testIsTarget('examples/vue/src/pages/exclude/home.vue').toBe(false)
    testIsTarget('examples/vue/src/pages/home.txt').toBe(false)
  })
})
