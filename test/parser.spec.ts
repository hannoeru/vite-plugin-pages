import fs from 'fs'
import { resolve } from 'path'
import { parseSFC, parseCustomBlock } from '../src/parser'
import { resolveOptions } from '../src/options'

const options = resolveOptions({})
const path = resolve('./test/assets/pages/blog/[id].vue')
const VueFile = fs.readFileSync(path, 'utf-8')

describe('Parser', () => {
  test('custom block', async() => {
    const parsed = await parseSFC(VueFile)
    const customBlock = parsed.customBlocks.find(b => b.type === 'route')!
    const parsedCustomBlock = parseCustomBlock(customBlock, path, options)
    expect(parsedCustomBlock).toMatchSnapshot('custom block')
  })
})
