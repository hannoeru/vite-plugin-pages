import { resolve } from 'node:path'
import { getRouteBlock, parseJSX, parseYamlComment } from '../src/customBlock'
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

describe('parseJSX', () => {
  it('finds a leading route block comment', () => {
    const code = `/*\n\n      route\n\nname: blog-id\nmeta:\n  id: 1\n*/\n`
    const result = parseJSX(code)
    expect(result).toHaveLength(1)
    expect(result[0].loc.start.line).toBe(1)
  })

  it('preserves the raw comment body as value', () => {
    const code = `/*\n  route\n\nname: blog-id\n*/\nimport foo from 'foo'`
    const [entry] = parseJSX(code)
    expect(entry.value).toContain('route')
    expect(entry.value).toContain('name: blog-id')
  })

  it('returns an empty array for code with no comment', () => {
    expect(parseJSX('export default {}')).toEqual([])
  })

  it('returns an empty array for an empty string', () => {
    expect(parseJSX('')).toEqual([])
  })

  it('ignores a block comment that does not start on the first line', () => {
    const code = `import foo from 'foo'\n\n/*\n  route\nname: x\n*/`
    expect(parseJSX(code)).toEqual([])
  })

  it('ignores a leading line comment before the block', () => {
    const code = `// some leading note\n/*\n  route\nname: x\n*/`
    expect(parseJSX(code)).toEqual([])
  })

  it('ignores a block comment without the route marker', () => {
    const code = `/*\nname: blog-id\nmeta:\n  id: 1\n*/`
    expect(parseJSX(code)).toEqual([])
  })

  it('ignores a block comment without any key/value colon', () => {
    const code = `/*\n  route\nno-colon-here\n*/`
    expect(parseJSX(code)).toEqual([])
  })

  it('ignores an unterminated block comment', () => {
    const code = `/*\n  route\nname: x`
    expect(parseJSX(code)).toEqual([])
  })

  it('only returns the first (leading) route comment', () => {
    const code = `/*\n  route\nname: first\n*/\n\n/*\n  route\nname: second\n*/`
    const result = parseJSX(code)
    expect(result).toHaveLength(1)
    expect(result[0].value).toContain('name: first')
    expect(result[0].value).not.toContain('name: second')
  })

  it('does not treat a bare "route" followed by a word as a marker', () => {
    const code = `/*\n  routes\nname: x\n*/`
    expect(parseJSX(code)).toEqual([])
  })

  it('stays stable across consecutive calls (lastIndex regression)', () => {
    const code = `/*\n\n      route\n\nname: blog-id\n*/\n`
    const first = parseJSX(code)
    const second = parseJSX(code)
    const third = parseJSX(code)
    expect(first).toHaveLength(1)
    expect(second).toEqual(first)
    expect(third).toEqual(first)
  })
})

describe('parseYamlComment', () => {
  it('parses a route block comment body into an object', () => {
    const code = `/*\n\n      route\n\nname: blog-id\nmeta:\n  requiresAuth: false\n  id: 1234\n*/\n`
    const result = parseYamlComment(parseJSX(code), 'test.jsx')
    expect(result).toEqual({
      name: 'blog-id',
      meta: {
        requiresAuth: false,
        id: 1234,
      },
    })
  })

  it('throws a descriptive error for invalid YAML', () => {
    const code = `/*\n  route\nname: [unclosed\n*/`
    expect(() => parseYamlComment(parseJSX(code), 'broken.jsx')).toThrow(/Invalid YAML format/)
  })
})
