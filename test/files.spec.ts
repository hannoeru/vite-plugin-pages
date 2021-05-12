import { resolve } from 'path'
import { resolveOptions } from '../src/options'
import { getPageFiles } from '../src/files'

const options = resolveOptions({})
const testPagesDir = resolve('test/assets/pages')

describe('Get files', () => {
  test('Pages file', async() => {
    const files = await getPageFiles(testPagesDir, options)
    expect(files.sort()).toMatchSnapshot('page files')
  })
})
