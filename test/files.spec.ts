import fs, { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { getPageDirs, getPageFiles } from '../src/files'
import { resolveOptions } from '../src/options'

const options = resolveOptions({}, process.cwd())
const testpages = 'examples/vue/src/pages'
const testDeeppages = 'examples/vue/src/features'

describe('get files', () => {
  it('prunes nested dependency and Git subtrees with default excludes', () => {
    const root = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))
    const pages = join(root, 'src/pages')
    try {
      mkdirSync(pages, { recursive: true })
      writeFileSync(join(pages, 'home.vue'), '<template><div /></template>')
      for (const dir of ['node_modules', '.git', 'nested/node_modules', 'nested/.git']) {
        mkdirSync(join(pages, dir, 'pkg'), { recursive: true })
        writeFileSync(join(pages, dir, 'pkg/index.vue'), '<template><div /></template>')
      }
      const resolved = resolveOptions({}, root)
      const readdir = vi.spyOn(fs, 'readdirSync')
      syncBuiltinESMExports()
      try {
        expect(getPageFiles(pages, resolved)).toEqual([join(pages, 'home.vue')])
        expect(readdir.mock.calls.map(([path]) => resolve(String(path)))).toEqual([
          pages,
          join(pages, 'nested'),
        ])
      }
      finally {
        readdir.mockRestore()
        syncBuiltinESMExports()
      }
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it.each(['pages/excluded', 'pages/excluded/**', '**/excluded/**'])('prunes the ignored subtree for %s', (exclude) => {
    const root = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))
    const pages = join(root, 'pages')
    try {
      mkdirSync(pages)
      writeFileSync(join(pages, 'home.vue'), '<template><div /></template>')
      for (let i = 0; i < 300; i++) {
        const dir = join(pages, 'excluded', String(i))
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'page.vue'), '<template><div /></template>')
      }
      const resolved = resolveOptions({ dirs: 'pages', exclude: [exclude] }, root)
      const readdir = vi.spyOn(fs, 'readdirSync')
      syncBuiltinESMExports()
      try {
        expect(getPageFiles(pages, resolved)).toEqual([join(pages, 'home.vue')])
        expect(getPageFiles(join(pages, 'excluded/1'), resolved)).toEqual([])
        expect(readdir.mock.calls.map(([path]) => resolve(String(path)))).toEqual([pages])
      }
      finally {
        readdir.mockRestore()
        syncBuiltinESMExports()
      }
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

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
  it('excludes an absolute page-directory pattern', () => {
    const root = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))
    try {
      const pages = join(root, 'pages')
      mkdirSync(pages)
      expect(getPageDirs({ dir: pages }, root, [pages])).toEqual([])
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

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
