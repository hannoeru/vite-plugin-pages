import { resolve } from 'path'
import { getRouteBlock } from '../src/customBlock'
import { resolveOptions } from '../src/options'

const options = resolveOptions({})

describe('Parser', () => {
  test('custom block', async() => {
    const path = resolve('./examples/vue/src/pages/blog/[id].vue')
    const routeBlock = await getRouteBlock(path, options)
    expect(routeBlock).toMatchSnapshot()
  })

  test('jsx yaml comment', async() => {
    const path = resolve('./examples/vue/src/pages/jsx.jsx')
    const routeBlock = await getRouteBlock(path, options)
    expect(routeBlock).toMatchSnapshot()
  })
})
