import { resolve } from 'path'
import { resolveOptions } from '../src/options'
import { getFilesFromPath } from '../src/files'

const options = resolveOptions({})
const testPagesDir = resolve('test/assets/pages')
const expectFiles = ['[...all].vue', 'about.vue', 'components.vue', 'index.vue', '[sensor]/current.vue', 'about/index.vue', 'blog/[id].vue', 'blog/index.vue', 'blog/today/index.vue', '[userId].vue']

describe('Get files', () => {
  test('Pages file', async() => {
    const files = await getFilesFromPath(testPagesDir, options)
    expect(files.sort()).toEqual(expectFiles.sort())
  })
})
