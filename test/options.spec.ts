import { resolveOptions } from '../src/options'

describe('Options', () => {
  test('resolve', () => {
    const options = resolveOptions({
      pages: 'examples/vue/src/pages',
    })
    const reactOptions = resolveOptions({
      pages: 'examples/react/src/pages',
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
