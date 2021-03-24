import { resolve } from 'path'
import { resolveOptions } from '../src/index'
import { getFilesFromPath } from '../src/files'

const options = resolveOptions({})
const testPagesDir = resolve('test/assets/pages')
const expectFiles = ['[...all].vue', 'home.vue', 'index.vue', 'user.vue', 'user/[id].vue']

describe('Get files', () => {
  test('Pages file', async() => {
    const files = await getFilesFromPath(testPagesDir, options)
    expect(files).toStrictEqual(expectFiles)
  })
})
