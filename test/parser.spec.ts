import { Buffer } from 'node:buffer'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createLogger } from 'vite'
import { PageContext } from '../src/context'
import { getRouteBlock, parseCustomBlock, parseJSX, parseSFC, parseYamlComment } from '../src/customBlock'
import { resolveOptions } from '../src/options'
import { generateClientCode } from '../src/stringify'

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

  it('treats a comment-only YAML route block as no route data', async () => {
    const descriptor = await parseSFC('<route lang="yaml">\n# No route data\n</route>')
    const routeBlock = parseCustomBlock(descriptor.customBlocks[0], 'empty.vue', options)
    expect(routeBlock).toBeNull()
  })

  describe.each(['\n', '\r\n', '\r'])('yaml line ending %j', (lineEnding) => {
    it.each([
      { name: 'blank', lines: ['', '', ''], expected: null },
      { name: 'whitespace-only', lines: ['   ', '\t ', '  '], expected: null },
      { name: 'comment-only', lines: ['# Comment', '# Comment'], expected: null },
      { name: 'mapping', lines: ['name: dashboard', 'meta:', '  requiresAuth: true'], expected: { name: 'dashboard', meta: { requiresAuth: true } } },
    ])('parses $name route data', ({ lines, expected }) => {
      const content = lines.join(lineEnding)
      const block = {
        type: 'route',
        lang: 'yaml',
        content,
        attrs: {},
        loc: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: content.length },
          source: content,
        },
      }
      expect(parseCustomBlock(block, 'test.vue', options)).toEqual(expected)
    })
  })
})

function amplifiedAliases(levels: number): string {
  const lines = ['a0: &a0 [0, 0]']
  for (let i = 1; i <= levels; i++)
    lines.push(`a${i}: &a${i} [*a${i - 1}, *a${i - 1}]`)
  return `meta:\n${lines.map(line => `  ${line}`).join('\n')}`
}

describe('yaml output limits', () => {
  async function parseBlock(content: string, lang = 'yaml') {
    const descriptor = await parseSFC(`<route lang="${lang}">\n${content}\n</route>`)
    return parseCustomBlock(descriptor.customBlocks[0], 'aliases.vue', options)
  }

  it('preserves ordinary shared aliases through route module generation', async () => {
    const data = await parseBlock('meta:\n  defaults: &defaults {roles: [reader], enabled: true}\n  page: *defaults')
    expect(data.meta.page).toBe(data.meta.defaults)
    const client = generateClientCode([data], options)
    expect(client).toBe(';\n\nconst routes = [{"meta":{"defaults":{"roles":["reader"],"enabled":true},"page":{"roles":["reader"],"enabled":true}}}];\n\nexport default routes;')
  })

  it.each([20, 60])('rejects amplified aliases at %i levels in SFC blocks and JSX comments', async (levels) => {
    const content = amplifiedAliases(levels)
    await expect(parseBlock(content)).rejects.toThrow(/Route YAML exceeds the 100x JSON expansion limit/)
    await expect(parseBlock(content, 'yml')).rejects.toThrow(/Route YAML exceeds the 100x JSON expansion limit/)
    expect(() => parseYamlComment(parseJSX(`/*\nroute\n${content}\n*/`), 'aliases.jsx'))
      .toThrow(/Route YAML exceeds the 100x JSON expansion limit/)
  })

  it('accepts aliases below the output limit', async () => {
    const data = await parseBlock(amplifiedAliases(10))
    expect(Buffer.byteLength(JSON.stringify(data))).toBe(16420)
    expect(generateClientCode([data], options)).toContain('export default routes;')
  })

  it('counts each alias in the expanded output', async () => {
    await expect(parseBlock(amplifiedAliases(16)))
      .rejects
      .toThrow(/Route YAML exceeds the 100x JSON expansion limit/)
  })

  it.each([
    ['{key: [true, null, 1.5, text]}', { key: [true, null, 1.5, 'text'] }],
    ['[true, null, 1.5, text]', [true, null, 1.5, 'text']],
    ['[&shared {a: 1}, *shared]', [{ a: 1 }, { a: 1 }]],
    ['{value: 0x10, date: 2001-12-15, enabled: TRUE}', { value: 16, date: '2001-12-15', enabled: true }],
    ['text', 'text'],
    ['42', 42],
    ['false', false],
    ['null', null],
    ['-0', -0],
  ])('preserves the JSON-compatible root value %s', async (content, expected) => {
    expect(await parseBlock(content)).toEqual(expected)
  })

  it.each([
    ['{name: index}', { name: 'index' }],
    ['[1, {a: 2}]', { 0: 1, 1: { a: 2 } }],
    ['"a:b"', { 0: 'a', 1: ':', 2: 'b' }],
  ])('preserves root spreads in JSX route comments for %s', (content, expected) => {
    expect(parseYamlComment(parseJSX(`/*\nroute\n${content}\n*/`), 'root.jsx')).toEqual(expected)
  })

  it.each([
    'value: &self\n  nested: *self',
    '&self [*self]',
    'value: .inf',
    'value: .nan',
    'value: !!timestamp 2001-12-15T02:59:43.1Z',
  ])('rejects cycles and unsupported values in SFC blocks', async (content) => {
    await expect(parseBlock(content)).rejects.toThrow(/Invalid YAML format/)
  })

  it.each([
    (value: string) => JSON.stringify(value),
    (value: string) => `{"key":${JSON.stringify(value)}}`,
    (value: string) => `[${JSON.stringify(value)}]`,
  ])('preserves large ordinary YAML without aliases', async (source) => {
    const content = source('x'.repeat(1048576))
    expect(JSON.stringify(await parseBlock(content))).toBe(content)
  })

  it('accepts the exact expansion boundary and rejects one fewer source byte', async () => {
    const descriptor = await parseSFC('<route lang="yaml">null</route>')
    const source = `${amplifiedAliases(12)}\npadding: "xxxxxxx"`
    const content = `${source}\n#${' '.repeat(656 - Buffer.byteLength(source) - 2)}`
    expect(Buffer.byteLength(content)).toBe(656)
    const block = { ...descriptor.customBlocks[0], content }
    expect(Buffer.byteLength(JSON.stringify(parseCustomBlock(block, 'boundary.vue', options)))).toBe(65600)
    expect(() => parseCustomBlock({ ...block, content: content.slice(0, -1) }, 'boundary.vue', options))
      .toThrow(/Route YAML exceeds the 100x JSON expansion limit/)
  })

  it.each(['é', '\n', '"'])('counts UTF-8 bytes and JSON escapes in scalar aliases for %j', async (character) => {
    const content = `meta:\n  text: &text ${JSON.stringify(character.repeat(4096))}\n  copies: [${Array.from({ length: 700 }).fill('*text').join(', ')}]`
    await expect(parseBlock(content)).rejects.toThrow(/Route YAML exceeds the 100x JSON expansion limit/)
  })

  it('counts mapping keys in repeated objects', async () => {
    const key = 'é'.repeat(4096)
    const content = `meta:\n  object: &object {${JSON.stringify(key)}: 0}\n  copies: [${Array.from({ length: 700 }).fill('*object').join(', ')}]`
    await expect(parseBlock(content)).rejects.toThrow(/Route YAML exceeds the 100x JSON expansion limit/)
  })

  it.each(['vue', 'jsx'])('does not emit amplified aliases from a %s page', async (extension) => {
    const root = mkdtempSync(join(tmpdir(), 'pages-yaml-aliases-'))
    mkdirSync(join(root, 'pages'))
    const path = join(root, 'pages', `index.${extension}`)
    const content = amplifiedAliases(20)
    writeFileSync(path, extension === 'vue'
      ? `<template><div /></template><route lang="yaml">\n${content}\n</route>`
      : `/*\nroute\n${content}\n*/\nexport default {}`)
    const logger = createLogger()
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
    try {
      const ctx = new PageContext({ dirs: 'pages', extensions: [extension] }, root)
      ctx.setLogger(logger)
      await ctx.searchGlob()
      const client = await ctx.resolveRoutes()
      expect(error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('Route YAML exceeds the 100x JSON expansion limit'))
      expect(client).not.toContain('"meta"')
      expect(client).toContain('export default routes;')
      expect(client.length).toBeLessThan(512)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
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

  it('parses an undecorated JSDoc route block comment', () => {
    const code = `/**\nroute\nname: dashboard\n*/`
    expect(parseYamlComment(parseJSX(code), 'test.jsx')).toEqual({
      name: 'dashboard',
    })
  })

  it.each([
    `/**\n * route\n *\n * name: dashboard\n * meta:\n *   requiresAuth: true\n */`,
    `/*\n * route\n *\n * name: dashboard\n * meta:\n *   requiresAuth: true\n */`,
    `/*\r\n * route\r\n * name: dashboard\r\n * meta:\r\n *   requiresAuth: true\r\n */`,
    `/*\n*route\n*name: dashboard\n*meta:\n*  requiresAuth: true\n*/`,
    `/*\n*\troute\n*\tname: dashboard\n*\tmeta:\n*\t  requiresAuth: true\n*/`,
  ])('parses a decorated route block comment', (code) => {
    expect(parseYamlComment(parseJSX(code), 'test.jsx')).toEqual({
      name: 'dashboard',
      meta: {
        requiresAuth: true,
      },
    })
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

  it.each([
    'publishedAt: !!timestamp 2001-12-15T02:59:43.1Z',
    'data: !!binary SGVsbG8=',
    'roles: !!set\n  admin:',
  ])('rejects YAML tags outside the core schema', (routeData) => {
    const code = `/*\n  route\n${routeData}\n*/`
    expect(() => parseYamlComment(parseJSX(code), 'tagged.jsx')).toThrow(/Invalid YAML format/)
  })

  it.each([
    'value: .inf',
    'value: .nan',
    'value: &self\n  nested: *self',
  ])('rejects route data that is not JSON-compatible', (routeData) => {
    const code = `/*\n  route\n${routeData}\n*/`
    expect(() => parseYamlComment(parseJSX(code), 'unsupported.jsx')).toThrow(/Invalid YAML format/)
  })
})
