import { join } from 'path'
import { describe, expect, test } from 'vitest'
import { resolveOptions } from '../src/options'
import { getPageDirs, getPageFiles } from '../src/files'

const options = resolveOptions({}, process.cwd())
const testpages = 'examples/vue/src/pages'
const testDeeppages = 'examples/vue/src/features'

describe('Get files', () => {
  test('pages', async() => {
    const files = getPageFiles(testpages, options)
    expect(files.sort()).toMatchSnapshot()
  })
})

describe('Get page dirs', () => {
  test('with glob', async() => {
    const PageOptions = {
      dir: join(testDeeppages, '**', 'pages'),
      baseRoute: '',
    }
    const dirs = getPageDirs(PageOptions, options.root, options.exclude)
    expect(dirs.sort()).toMatchSnapshot()
  })
})
