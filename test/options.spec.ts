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
})
