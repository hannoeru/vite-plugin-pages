import { describe, expect, test } from 'vitest'
import { resolveOptions } from '../src/options'

describe('Options', () => {
  test('resolve', () => {
    const options = resolveOptions({
      dirs: 'examples/vue/src/pages',
    })
    const reactOptions = resolveOptions({
      dirs: 'examples/react/src/pages',
      resolver: 'react',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    }, 'vue')
    expect(reactOptions).toMatchSnapshot({
      root: expect.any(String),
    }, 'react')
  })
})
