import fs from 'fs'
import { resolve } from 'path'
import { parseSFC, tryParseCustomBlock } from '../src/parseSfc'
import { resolveOptions } from '../src/index'

const options = resolveOptions({})
const path = resolve('./test/assets/pages/user/[id].vue')
const VueFile = fs.readFileSync(path, 'utf-8')

const expectCustomBlock = {
  meta: {
    requiresAuth: false,
  },
  name: 'name-override',
}

describe('Parser', () => {
  const parsed = parseSFC(VueFile)
  const customBlock = parsed.customBlocks.find(b => b.type === 'route')!
  test('SFC', () => {
    expect(parsed).toMatchSnapshot()
  })
  test('custom block', () => {
    const parsedCustomBlock = tryParseCustomBlock(customBlock, path, options)
    expect(parsedCustomBlock).toStrictEqual(expectCustomBlock)
  })
})
