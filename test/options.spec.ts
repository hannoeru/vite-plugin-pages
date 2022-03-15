import { describe, expect, test } from 'vitest'
import { resolveOptions } from '../src/options'

describe('Options resolve', () => {
  test('vue', () => {
    const options = resolveOptions({
      dirs: 'examples/vue/src/pages',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  test('react', () => {
    const options = resolveOptions({
      dirs: 'examples/react/src/pages',
      resolver: 'react',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  test('solid', () => {
    const options = resolveOptions({
      dirs: 'examples/solid/src/pages',
      resolver: 'solid',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })
})
