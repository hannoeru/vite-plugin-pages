import { resolve } from 'path'
import { resolveOptions } from '../src/options'
import { getPageFiles } from '../src/files'

const options = resolveOptions({})
const testPagesDir = resolve('test/assets/pages')
const testGlobPagesDir = resolve('test/assets/deep-pages/**/pages')

describe('Get files', () => {
  test('Pages file', async() => {
    const files = await getPageFiles(testPagesDir, options)
    expect(files.sort()).toMatchSnapshot('page files')
  })

  test('Pages files with glob pagesDir', async() => {
    const files = await getPageFiles(testGlobPagesDir, options)
    expect(files.sort()).toMatchSnapshot('pages files with glob pagesDir')
  })
})
