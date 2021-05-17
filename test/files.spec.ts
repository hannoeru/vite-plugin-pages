import { resolve } from 'path'
import { resolveOptions } from '../src/options'
import { getPageFiles, getPageDirs } from '../src/files'

const options = resolveOptions({})
const testPagesDir = resolve('test/assets/pages')
const testGlobPagesDir = resolve('test/assets/deep-pages/**/pages')

describe('Get files', () => {
  test('Pages file', async() => {
    const files = await getPageFiles(testPagesDir, options)
    expect(files.sort()).toMatchSnapshot('page files')
  })
})

describe('Get page dirs', () => {
  test('Page dirs with glob pagesDir', async() => {
    const pageDirOptions = {
      dir: testGlobPagesDir,
      baseRoute: '/',
    }
    const dirs = await getPageDirs(pageDirOptions, options)
    expect(dirs.sort()).toMatchSnapshot('pages dirs with glob pagesDir')
  })
})
