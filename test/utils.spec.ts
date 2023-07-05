import { buildReactRemixRoutePath, buildReactRoutePath, countSlash, extsToGlob, isCatchAllRoute, isDynamicRoute } from '../src/utils'

describe('Utils', () => {
  test('extensions to glob', () => {
    expect(extsToGlob(['vue', 'ts', 'js'])).toBe('{vue,ts,js}')
  })

  test('is dynamic route', () => {
    expect(isDynamicRoute('[id]', 'next')).toBe(true)
    expect(isDynamicRoute('_id', 'nuxt')).toBe(true)
    expect(isDynamicRoute('[id]', 'nuxt3')).toBe(true)
    expect(isDynamicRoute('[[id]]', 'nuxt3')).toBe(true)
    expect(isDynamicRoute('user-[id]', 'nuxt3')).toBe(true)
    expect(isDynamicRoute('user-[[id]]', 'nuxt3')).toBe(true)
    expect(isDynamicRoute('me', 'remix')).toBe(false)
  })

  test('is catch all route', () => {
    expect(isCatchAllRoute('[...all]', 'next')).toBe(true)
    expect(isCatchAllRoute('_', 'nuxt')).toBe(true)
    expect(isCatchAllRoute('[...all]', 'nuxt3')).toBe(true)

    expect(isCatchAllRoute('[id]', 'next')).toBe(false)
    expect(isCatchAllRoute('_id', 'nuxt')).toBe(false)
    expect(isCatchAllRoute('[id]', 'nuxt3')).toBe(false)
    expect(isCatchAllRoute('[[id]]', 'nuxt3')).toBe(false)
    expect(isCatchAllRoute('user-[id]', 'nuxt3')).toBe(false)
    expect(isCatchAllRoute('user-[[id]]', 'nuxt3')).toBe(false)
  })

  test('count slash', () => {
    expect(countSlash('route')).toBe(0)
    expect(countSlash('user/route/current')).toBe(2)
  })

  // react route path
  test('react route path', () => {
    expect(buildReactRoutePath('index', 'next')).toBe('index')
    expect(buildReactRoutePath('[...all]', 'next')).toBe('*')
    expect(buildReactRoutePath('[id]', 'next')).toBe(':id')
    expect(buildReactRoutePath('[[id]]', 'nuxt3')).toBe(':id')
    expect(buildReactRoutePath('normal', 'next')).toBe('normal')
  })

  test('remix style route path', () => {
    expect(buildReactRemixRoutePath('root')).toBe('root')
    expect(buildReactRemixRoutePath('about')).toBe('about')
    expect(buildReactRemixRoutePath('__marketing')).toBeUndefined()
    expect(buildReactRemixRoutePath('blog.authors')).toBe('blog/authors')
    expect(buildReactRemixRoutePath('[blog.authors]')).toBe('blog.authors')
    expect(buildReactRemixRoutePath('*')).toBe('*')
  })
})
