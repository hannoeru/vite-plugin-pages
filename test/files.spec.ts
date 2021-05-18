import { resolve } from 'path'
import { resolveOptions } from '../src/options'
import { getPageFiles, getPageDirs } from '../src/files'

const options = resolveOptions({})
const testPagesDir = resolve('test/assets/pages')
const testDeepPagesDir = resolve('test/assets/deep-pages')

describe('Get files', () => {
  test('Pages file', async() => {
    const files = await getPageFiles(testPagesDir, options)
    expect(files.sort()).toMatchSnapshot('page files')
  })
})

describe('Get page dirs', () => {
  test('With glob', async() => {
    const pageDirOptions = {
      dir: resolve(testDeepPagesDir, '**', 'pages'),
      baseRoute: '/',
    }
    const dirs = getPageDirs(pageDirOptions, options.exclude)
    const sortedDirs = dirs.sort()
    expect(sortedDirs).toHaveLength(2)
    expect(sortedDirs[0].baseRoute).toBe('/')
    expect(sortedDirs[0].dir).toBe(
      resolve(testDeepPagesDir, 'bar', 'pages'),
    )
    expect(sortedDirs[1].baseRoute).toBe('/')
    expect(sortedDirs[1].dir).toBe(
      resolve(testDeepPagesDir, 'foo', 'pages'),
    )
  })
})
