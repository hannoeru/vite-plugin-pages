import { resolve } from 'node:path'
import { getRouteBlock, parseJSX } from '../src/customBlock'
import { resolveOptions } from '../src/options'

const options = resolveOptions({})

describe('parser', () => {
  it('custom block', async () => {
    const path = resolve('./examples/vue/src/pages/blog/[id].vue')
    const routeBlock = await getRouteBlock(path, options)
    expect(routeBlock).toMatchSnapshot()
  })

  it('parseJSX consecutive calls stay stable', () => {
    const code = `/*

      route

name: blog-id
meta:
  id: 1
*/
`
    expect(parseJSX(code)).toHaveLength(1)
    expect(parseJSX(code)).toHaveLength(1)
    expect(parseJSX(code)).toHaveLength(1)
  })

  it('jsx yaml comment', async () => {
    const path = resolve('./examples/vue/src/pages/jsx.jsx')
    const routeBlock = await getRouteBlock(path, options)
    expect(routeBlock).toMatchSnapshot()
  })
})
