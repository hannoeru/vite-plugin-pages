import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getPageDirs, getPageFiles } from '../src/files'
import { resolveOptions } from '../src/options'

const options = resolveOptions({}, process.cwd())
const testpages = 'examples/vue/src/pages'
const testDeeppages = 'examples/vue/src/features'

describe('get files', () => {
  it('pages', async () => {
    const files = getPageFiles(testpages, options)
    expect(files.sort()).toMatchSnapshot()
  })
})

describe('get files - direct children only', () => {
  it('pages', async () => {
    const files = getPageFiles(testpages, options, {
      dir: join(testDeeppages, '**', 'pages'),
      baseRoute: '',
      filePattern: '*.vue',
    })
    expect(files.sort()).toMatchSnapshot()
  })
})

describe('get page dirs', () => {
  it('preserves project-relative directory exclusions', () => {
    const root = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))
    try {
      mkdirSync(join(root, 'features/allowed/pages'), { recursive: true })
      mkdirSync(join(root, 'features/excluded/pages'), { recursive: true })
      expect(getPageDirs({ dir: 'features/**/pages' }, root, ['features/excluded/**'])).toEqual([
        { dir: 'features/allowed/pages' },
      ])
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('with glob', async () => {
    const PageOptions = {
      dir: join(testDeeppages, '**', 'pages'),
      baseRoute: '',
    }
    const dirs = getPageDirs(PageOptions, options.root, options.exclude)
    expect(dirs.sort()).toMatchSnapshot()
  })
})
