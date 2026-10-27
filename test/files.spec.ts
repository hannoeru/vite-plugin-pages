import fs, { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { slash } from '@antfu/utils'
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
      for (const dir of [
        'node_modules',
        '.git',
        'nested/node_modules',
        'nested/.git',
      ]) {
        mkdirSync(join(pages, dir, 'pkg'), { recursive: true })
        writeFileSync(join(pages, dir, 'pkg/index.vue'), '<template><div /></template>')
      }
      const resolved = resolveOptions({}, root)
      const readdir = vi.spyOn(fs, 'readdirSync')
      syncBuiltinESMExports()
      try {
        expect(getPageFiles(pages, resolved)).toEqual([
          slash(join(pages, 'home.vue')),
        ])
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

  it.each(['excluded', 'excluded/**', '**/excluded/**'])('prunes the ignored subtree for %s', (exclude) => {
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
      const resolved = resolveOptions({
        dirs: 'pages',
        exclude: [exclude],
      }, root)
      const readdir = vi.spyOn(fs, 'readdirSync')
      syncBuiltinESMExports()
      try {
        expect(getPageFiles(pages, resolved)).toEqual([
          slash(join(pages, 'home.vue')),
        ])
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

  it.each([
    '*',
    'nested*',
    'nested',
    'nested/**',
    '**/nested*',
  ])('prunes a fixed file-pattern prefix excluded by %s', (exclude) => {
    const root = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))
    const pages = join(root, 'pages')
    const page = { dir: 'pages', filePattern: 'nested/*.vue' }
    try {
      mkdirSync(join(pages, 'nested/deep'), { recursive: true })
      const file = join(pages, 'nested/home.vue')
      writeFileSync(file, '<template><div /></template>')
      writeFileSync(join(pages, 'nested/deep/home.vue'), '<template><div /></template>')
      const included = resolveOptions({
        dirs: [page],
        exclude: [],
      }, root)
      expect(getPageFiles(pages, included, page)).toEqual([
        slash(file),
      ])
      const resolved = resolveOptions({
        dirs: [page],
        exclude: [exclude],
      }, root)
      const readdir = vi.spyOn(fs, 'readdirSync')
      syncBuiltinESMExports()
      try {
        expect(getPageFiles(pages, resolved, page)).toEqual([])
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

  it('prunes page-relative excludes independently in hidden and external directories', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-[fixture]-'))
    const root = join(fixture, '.project')
    const dirs = ['src/pages', 'src/.pages', '../.shared/[pages]']
    try {
      mkdirSync(root)
      for (const dir of dirs) {
        const pages = resolve(root, dir)
        mkdirSync(join(pages, 'drafts/deep'), { recursive: true })
        writeFileSync(join(pages, 'home.vue'), '<template><div /></template>')
        writeFileSync(join(pages, 'drafts/deep/home.vue'), '<template><div /></template>')
      }
      const resolved = resolveOptions({
        dirs: [],
        exclude: ['drafts/**'],
      }, root)
      const readdir = vi.spyOn(fs, 'readdirSync')
      syncBuiltinESMExports()
      try {
        for (const dir of dirs) {
          const pages = resolve(root, dir)
          expect(getPageFiles(pages, resolved)).toEqual([
            slash(join(pages, 'home.vue')),
          ])
        }
        expect(readdir.mock.calls.map(([path]) => resolve(String(path))).sort()).toEqual(
          dirs.map(dir => resolve(root, dir)).sort(),
        )
      }
      finally {
        readdir.mockRestore()
        syncBuiltinESMExports()
      }
    }
    finally {
      rmSync(fixture, { recursive: true, force: true })
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
  it('does not apply page-relative excludes to directory enumeration', () => {
    const root = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))
    try {
      for (const dir of [
        'allowed',
        'excluded',
        '.hidden',
        '[feature]',
      ])
        mkdirSync(join(root, 'features', dir, 'pages'), { recursive: true })

      const resolved = resolveOptions({
        dirs: 'features/*/pages',
        exclude: ['features/**', 'excluded/**'],
      }, root)
      expect(resolved.dirs.map(page => page.dir).sort()).toEqual([
        'features/.hidden/pages',
        'features/[feature]/pages',
        'features/allowed/pages',
        'features/excluded/pages',
      ])
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it.each(['**/pages', 'node_modules/pkg/pages', '.git/hooks/pages'])('allows directory selection under dependencies and Git with %s', (dir) => {
    const root = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-'))
    try {
      for (const parent of ['allowed', 'node_modules/pkg', '.git/hooks'])
        mkdirSync(join(root, parent, 'pages'), { recursive: true })

      const expected = dir === '**/pages'
        ? ['.git/hooks/pages', 'allowed/pages', 'node_modules/pkg/pages']
        : [dir]
      expect(resolveOptions({ dirs: dir, exclude: [] }, root).dirs.map(page => page.dir).sort()).toEqual(expected)
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
    const dirs = getPageDirs(PageOptions, options.root)
    expect(dirs.sort()).toMatchSnapshot()
  })
})
