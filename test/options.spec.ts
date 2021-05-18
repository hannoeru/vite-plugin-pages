import { resolveOptions } from '../src/options'

describe('Options', () => {
  test('resolve', () => {
    const options = resolveOptions({
      pagesDir: 'test/assets/pages',
    })
    delete options.root
    expect(options).toMatchSnapshot('resolved options')
  })
})
