import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveOptions } from '../src/options'

describe('options resolve', () => {
  it('vue', () => {
    const options = resolveOptions({
      dirs: 'examples/vue/src/pages',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  it('vue - custom module id', () => {
    const options = resolveOptions({
      dirs: 'examples/vue/src/pages',
      moduleId: '~vue-pages',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  it('react', () => {
    const options = resolveOptions({
      dirs: 'examples/react/src/pages',
      resolver: 'react',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  it('solid', () => {
    const options = resolveOptions({
      dirs: 'examples/solid/src/pages',
      resolver: 'solid',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  it('keeps documented defaults aligned with runtime defaults', () => {
    const documentation = readFileSync('docs/config.md', 'utf8')
    const root = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-docs-'))
    onTestFinished(() => rmSync(root, { force: true, recursive: true }))
    mkdirSync(join(root, 'src/pages'), { recursive: true })

    const vue = resolveOptions({}, root)
    const react = resolveOptions({ resolver: 'react' }, root)
    const solid = resolveOptions({ resolver: 'solid' }, root)

    function documentedDefault(option: string) {
      const row = documentation
        .split('\n')
        .find(line => line.startsWith(`| [\`${option}\`]`))

      if (!row)
        throw new Error(`Missing ${option} from the options summary`)

      return row.split(' | ')[2]
    }

    function quote(value: string) {
      return `\`${JSON.stringify(value).replaceAll('"', '\'')}\``
    }

    function quoteArray(values: string[]) {
      return `\`[${values.map(value => `'${value}'`).join(', ')}]\``
    }

    expect(documentedDefault('dirs')).toBe(quote(vue.dirs[0].dir))
    expect(documentedDefault('exclude')).toBe(quoteArray(vue.exclude))
    expect(documentedDefault('importPath')).toBe(quote(vue.importPath))
    expect(documentedDefault('routeBlockLang')).toBe(quote(vue.routeBlockLang))
    expect(documentedDefault('routeStyle')).toBe(quote(vue.routeStyle))
    expect(documentedDefault('routeNameSeparator')).toBe(quote(vue.routeNameSeparator))
    expect(documentedDefault('caseSensitive')).toBe(`\`${vue.caseSensitive}\``)

    expect(documentation).toContain(`- Vue: ${quoteArray(vue.extensions)}`)
    expect(documentation).toContain(`- React: ${quoteArray(react.extensions)}`)
    expect(documentation).toContain(`- Solid: ${quoteArray(solid.extensions)}`)
    expect(documentation).toContain(`- Vue: ${quoteArray(vue.moduleIds)}`)
    expect(documentation).toContain(`- React: ${quoteArray(react.moduleIds)}`)
    expect(documentation).toContain(`- Solid: ${quoteArray(solid.moduleIds)}`)
  })

  it('applies defaults to page options without a base route', () => {
    const options = resolveOptions({
      dirs: [
        { dir: 'examples/react/src/pages', filePattern: '**/*.page.tsx' },
        { dir: 'examples/react/src/pages', baseRoute: '/admin/', filePattern: '**/*.view.tsx' },
      ],
      resolver: 'react',
    })

    expect(options.dirs).toHaveLength(2)
    expect(options.dirs[0]).toEqual({
      dir: 'examples/react/src/pages',
      baseRoute: '',
      filePattern: '**/*.page.tsx',
    })
    expect(options.dirs[1]).toEqual({
      dir: 'examples/react/src/pages',
      baseRoute: 'admin',
      filePattern: '**/*.view.tsx',
    })
  })
})
