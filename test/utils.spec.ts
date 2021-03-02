import { extensionsToGlob, normalizePath, isDynamicRoute, pathToName } from '../src/utils'

describe('Utils', () => {
  test('Extensions to glob', () => {
    expect(extensionsToGlob(['vue', 'ts', 'js'])).toBe('{vue,ts,js}')
  })
  test('Normalize path', () => {
    expect(normalizePath('C:\\project\\from\\someone')).toBe('C:/project/from/someone')
  })
  test('Dynamic route', () => {
    expect(isDynamicRoute('[id]')).toBe(true)
    expect(isDynamicRoute('me')).toBe(false)
  })
  test('Path to name', () => {
    expect(pathToName('user-[route]-current')).toBe('user_$route$_current')
  })
})
