import { resolveOptions } from '../src/options'

describe('Options', () => {
  test('resolve', () => {
    const options = resolveOptions({
      pagesDir: 'test/assets/pages',
    })
    const reactOptions = resolveOptions({
      pagesDir: 'test/assets/pages',
      react: true,
    })
    delete options.root
    delete reactOptions.root
    expect(options).toMatchSnapshot('resolved options')
    expect(reactOptions).toMatchSnapshot('resolved options - react')
  })
})
