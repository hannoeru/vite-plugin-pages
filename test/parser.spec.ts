import { resolve } from 'node:path'
import { getRouteBlock } from '../src/customBlock'
import { resolveOptions } from '../src/options'

const options = resolveOptions({})

describe('parser', () => {
  it('custom block', async () => {
    const path = resolve('./examples/vue/src/pages/blog/[id].vue')
    const routeBlock = await getRouteBlock(path, options)
    expect(routeBlock).toMatchSnapshot()
  })

  it('jsx yaml comment', async () => {
    const path = resolve('./examples/vue/src/pages/jsx.jsx')
    const routeBlock = await getRouteBlock(path, options)
    expect(routeBlock).toMatchSnapshot()
  })
})
