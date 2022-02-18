import { describe, expect, test } from 'vitest'
import { buildReactRemixRoutePath, buildReactRoutePath, countSlash, extsToGlob, isCatchAllRoute, isDynamicRoute, pathToName } from '../src/utils'

describe('Utils', () => {
  test('extensions to glob', () => {
    expect(extsToGlob(['vue', 'ts', 'js'])).toBe('{vue,ts,js}')
  })
  test('is dynamic route', () => {
    expect(isDynamicRoute('[id]')).toBe(true)
    expect(isDynamicRoute('_id', true)).toBe(true)
    expect(isDynamicRoute('me')).toBe(false)
  })
  test('is catch all route', () => {
    expect(isCatchAllRoute('[...all]')).toBe(true)
    expect(isCatchAllRoute('_', true)).toBe(true)
    expect(isCatchAllRoute('[id]')).toBe(false)
    expect(isCatchAllRoute('_id', true)).toBe(false)
  })
  test('path to name', () => {
    expect(pathToName('user-[route]-current')).toBe('user_$route$_current')
  })
  test('count slash', () => {
    expect(countSlash('route')).toBe(0)
    expect(countSlash('user/route/current')).toBe(2)
  })

  // react route path
  test('react route path', () => {
    expect(buildReactRoutePath('index')).toBe('index')
    expect(buildReactRoutePath('[...all]')).toBe('*')
    expect(buildReactRoutePath('[id]')).toBe(':id')
    expect(buildReactRoutePath('normal')).toBe('normal')
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
