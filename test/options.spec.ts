import { resolveOptions } from '../src/options'

describe('Options', () => {
  test('resolve', () => {
    const options = resolveOptions({
      pages: 'test/assets/pages',
    })
    const reactOptions = resolveOptions({
      pages: 'test/assets/pages',
      react: true,
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    }, 'resolved options')
    expect(reactOptions).toMatchSnapshot({
      root: expect.any(String),
    }, 'resolved options - react')
  })
})
