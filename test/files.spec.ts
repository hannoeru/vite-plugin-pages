import { join } from 'path'
import { resolveOptions } from '../src/options'
import { getPageFiles, getPageDirs } from '../src/files'

const options = resolveOptions({}, process.cwd())
const testpages = 'examples/vue/src/pages'
const testDeeppages = 'examples/vue/src/features'

describe('Get files', () => {
  test('Pages file', async() => {
    const files = getPageFiles(testpages, options)
    expect(files.sort()).toMatchSnapshot('page files')
  })
})

describe('Get page dirs', () => {
  test('With glob', async() => {
    const PageOptions = {
      dir: join(testDeeppages, '**', 'pages'),
      baseRoute: '',
    }
    const dirs = getPageDirs(PageOptions, options.root, options.exclude)
    expect(dirs.sort()).toMatchSnapshot('glob dirs')
  })
})
