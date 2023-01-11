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

  describe('option:resolveRouteBlock', () => {
    const userOptions = resolveOptions({
      resolveRouteBlock(content, filePath) {
        const isJsx = filePath.endsWith('.jsx') || filePath.endsWith('.tsx')
        if (isJsx && content.includes('definePageRoute')) {
          const RE = /definePageRoute\(([\s\S]*?)\);?/g
          const body = content.match(RE)?.[0]
          if (body) {
            // eslint-disable-next-line no-new-func
            const routeConfig = new Function(`function definePageRoute(config) { return config }; return ${body}`)()
            return routeConfig
          }
        }
      },
    })

    test('meet the condition of resolveRouteBlock', async() => {
      const path = resolve(__dirname, './data/CustomRouteBlock.jsx')
      const routeBlock = await getRouteBlock(path, userOptions)
      expect(routeBlock).toMatchSnapshot()
    })

    test('does not meet the condition of resolveRouteBlock', async() => {
      const vueFilePath = resolve('./examples/vue/src/pages/blog/[id].vue')
      const vueRouteBlock = await getRouteBlock(vueFilePath, userOptions)
      expect(vueRouteBlock).toMatchSnapshot()

      const jsxFilePath = resolve('./examples/vue/src/pages/jsx.jsx')
      const jsxRouteBlock = await getRouteBlock(jsxFilePath, userOptions)
      expect(jsxRouteBlock).toMatchSnapshot()
    })
  })
})
