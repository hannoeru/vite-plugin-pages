import { describe, expect, test } from 'vitest'
import { countSlash, extsToGlob, isCatchAllRoute, isDynamicRoute, pathToName } from '../src/utils'

describe('Utils', () => {
  test('Extensions to glob', () => {
    expect(extsToGlob(['vue', 'ts', 'js'])).toBe('{vue,ts,js}')
  })
  test('Dynamic route', () => {
    expect(isDynamicRoute('[id]')).toBe(true)
    expect(isDynamicRoute('_id', true)).toBe(true)
    expect(isDynamicRoute('me')).toBe(false)
  })
  test('Catch all route', () => {
    expect(isCatchAllRoute('[...all]')).toBe(true)
    expect(isCatchAllRoute('_', true)).toBe(true)
    expect(isCatchAllRoute('[id]')).toBe(false)
    expect(isCatchAllRoute('_id', true)).toBe(false)
  })
  test('Path to name', () => {
    expect(pathToName('user-[route]-current')).toBe('user_$route$_current')
  })
  test('Count slash', () => {
    expect(countSlash('route')).toBe(0)
    expect(countSlash('user/route/current')).toBe(2)
  })
})
