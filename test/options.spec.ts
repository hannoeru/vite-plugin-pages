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
    delete options.root
    delete reactOptions.root
    expect(options).toMatchSnapshot('vue')
    expect(reactOptions).toMatchSnapshot('react')
  })
})
