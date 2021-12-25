import { resolve } from 'path'
import { describe, expect, test } from 'vitest'
import { getRouteBlock } from '../src/customBlock'
import { resolveOptions } from '../src/options'

const options = resolveOptions({})
const path = resolve('./examples/vue/src/pages/blog/[id].vue')

describe('Parser', () => {
  test('custom block', async() => {
    const routeBlock = await getRouteBlock(path, options)
    expect(routeBlock).toMatchSnapshot()
  })
})
