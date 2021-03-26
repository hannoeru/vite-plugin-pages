import { resolveOptions } from '../src/options'

const resolvedOptions = {
  routeBlockLang: 'json5',
  root: process.cwd(),
  pagesDir: ['src/pages'],
  pagesDirOptions: [{ dir: 'src/pages', baseRoute: '' }],
  extensions: ['vue', 'js'],
  extensionsRE: /\.(vue|js)$/,
  importMode: 'async',
  nuxtStyle: false,
  exclude: [],
  syncIndex: true,
  replaceSquareBrackets: false,
}

describe('Options', () => {
  test('resolve', () => {
    const options = resolveOptions({})
    expect(options).toStrictEqual(resolvedOptions)
  })
})
