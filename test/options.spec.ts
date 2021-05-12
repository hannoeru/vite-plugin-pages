import { resolveOptions } from '../src/options'

describe('Options', () => {
  test('resolve', () => {
    const options = resolveOptions({})
    delete options.root
    expect(options).toMatchSnapshot('resolved options')
  })
})
