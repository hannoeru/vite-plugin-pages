import { resolve } from 'node:path'
import { getRouteBlock, parseCustomBlock, parseJSX, parseSFC, parseYamlComment } from '../src/customBlock'
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

  it('treats a comment-only YAML route block as no route data', async () => {
    const descriptor = await parseSFC('<route lang="yaml">\n# No route data\n</route>')
    const routeBlock = parseCustomBlock(descriptor.customBlocks[0], 'empty.vue', options)
    expect(routeBlock).toBeNull()
  })

  it('treats a blank YAML route block as no route data', () => {
    const routeBlock = parseCustomBlock({ lang: 'yaml', content: '   \n  \n' } as any, 'empty.vue', options)
    expect(routeBlock).toBeNull()
  })
})

describe('parseJSX', () => {
  it.each([
    'const el = <div></div>; ',
    'const el = <div />; ',
    'const el = <></>; ',
    'const el = <><div /></>; ',
    'const el = <div>/* route name: fake */</div>; ',
    'const el = <div title="/* not a comment */" />; ',
    'const el = <div>{value / 2}</div>; ',
    'const el = <div>{/["/]/.test(value)}</div>; ',
    'const el = <div>{`/* not a comment */`}</div>; ',
    'const el = <div>{() => <span />}</div>; ',
    'const el = <div>{',
  ])('parses actual route metadata after JSX code %s', (prefix) => {
    const code = `${prefix}/*\nroute\nname: protected-page\nmeta:\n  requiresAuth: true\n*/\nnull}</div>`
    expect(parseYamlComment(parseJSX(code, 'protected.jsx'), 'protected.jsx')).toEqual({
      name: 'protected-page',
      meta: { requiresAuth: true },
    })
  })

  it.each([
    ['protected.ts', 'const id = <T>(value: T) => value; '],
    ['protected.ts', 'const id = <T,>(value: T) => value; '],
    ['protected.ts', 'const value = <number>1; '],
    ['protected.mts', 'const value: number = 1; '],
    ['protected.cts', 'const value: number = 1; '],
    ['protected.MTS', 'const value: number = 1; '],
    ['protected.CTS', 'const value: number = 1; '],
    ['protected.TS', 'const value = <number>1; '],
    ['protected.JSX', 'const el = <div></div>; '],
    ['protected.TSX', 'const id = <T,>(value: T) => value; '],
    ['protected.ts', 'const result = identity<string>(value); '],
    ['protected.tsx', 'const id = <T,>(value: T) => value; '],
    ['protected.tsx', 'const el = <Component<Props> />; '],
    ['protected.tsx', 'function f() { const id = <T,>(value: T) => value; '],
  ])('uses the filename dialect for %s prefix %s', (path, prefix) => {
    const code = `${prefix}/*\nroute\nname: protected-page\nmeta:\n  requiresAuth: true\n*/`
    expect(parseYamlComment(parseJSX(code, path), path)).toEqual({
      name: 'protected-page',
      meta: { requiresAuth: true },
    })
  })

  it.each([
    'const el = <div>/*\nroute\nname: fake\n*/</div>;',
    'const el = <>/*\nroute\nname: fake\n*/</>;',
    'const el = <div>{/* ignored */value}</div>; /*\nroute\nname: later\n*/',
    'const value = <number>1; /*\nroute\nname: invalid-tsx\n*/',
  ])('does not extract JSX text or invalid TSX as route data', (code) => {
    for (const path of ['protected.jsx', 'protected.tsx'])
      expect(parseYamlComment(parseJSX(code, path), path)).toEqual({})
  })

  it.each(['\n', '\r', '\r\n', '\u2028', '\u2029'])('ignores comments after multiline JSX with %j', (line) => {
    const code = `const el = <div>${line}</div>; /*\nroute\nname: later\n*/`
    expect(parseYamlComment(parseJSX(code, 'protected.jsx'), 'protected.jsx')).toEqual({})
  })

  it.each([
    '\'use strict\'; ',
    'const value = 1; ',
    String.raw`const re = /["]/; `,
    String.raw`const re = /\/\*/; `,
    String.raw`const re = /[/*]/; `,
    'if (ok) /["]/ .test(value); ',
    'while (ok) /["]/ .test(value); ',
    'const value = 10 / 2 / 5; ',
    'const value = 10 / 2; ',
    `const value = \`outer \${\`inner\`} /*\`; `,
    `const value = \`outer \${\`inner /*\`} end\`; `,
    `const value = \`outer \${{ value: '/*' }.value} end\`; `,
    'const value = "/* not a comment */"; ',
    'const value = \'/* not a comment */\'; ',
    'const value = `/* not a comment */`; ',
    String.raw`const value = "escaped \" /* not a comment */"; `,
    String.raw`const value = 'escaped \' /* not a comment */'; `,
    'const value = `escaped \\` /* not a comment */`; ',
  ])('parses the first route comment after first-line code %s', (prefix) => {
    const code = `${prefix}/*\nroute\nname: protected-page\nmeta:\n  requiresAuth: true\n*/\nexport default {}`
    expect(parseYamlComment(parseJSX(code, 'test.jsx'), 'protected.jsx')).toEqual({
      name: 'protected-page',
      meta: {
        requiresAuth: true,
      },
    })
  })

  it.each([
    'const value = `/*\nroute\nname: fake\n*/`; ',
    `const value = \`outer \${\`/*\nroute\nname: fake\n*/\`} end\`; `,
    'const value = "/*\\nroute\\nname: fake\\n*/";',
    'const value = \'/*\\nroute\\nname: fake\\n*/\';',
    '\'use strict\'; // /*\nroute\nname: fake\n*/',
    '\'use strict\';\n/*\nroute\nname: later\n*/',
    '\'use strict\';\r/*\nroute\nname: later\n*/',
    '\'use strict\';\r\n/*\nroute\nname: later\n*/',
    '\'use strict\';\u2028/*\nroute\nname: later\n*/',
    '\'use strict\';\u2029/*\nroute\nname: later\n*/',
    'const re = /[/*]/; \r/*\nroute\nname: later\n*/',
    '\'use strict\'; /* not a route */ /*\nroute\nname: second\n*/',
    '\'use strict\'; /*\nroutes\nname: fake\n*/',
  ])('ignores non-route comments and literal delimiters %s', (code) => {
    expect(parseYamlComment(parseJSX(code, 'test.jsx'), 'test.jsx')).toEqual({})
  })

  it.each([
    '\'use strict\'; /**\nroute\nname: protected-page\nmeta:\n  requiresAuth: true\n*/\nexport default <div />',
    '\'use strict\'; /**\n * route\n * name: protected-page\n * meta:\n *   requiresAuth: true\n */\nexport default <Component<Props> />',
    '\'use strict\'; /* route\nname: protected-page\nmeta:\n  requiresAuth: true\n*/\n@unsupported',
  ])('preserves route data without parsing the JSX or TSX body', (code) => {
    expect(parseYamlComment(parseJSX(code, 'test.jsx'), 'protected.tsx')).toEqual({
      name: 'protected-page',
      meta: {
        requiresAuth: true,
      },
    })
  })

  it('stops at a complete first-line comment before unsupported syntax', () => {
    const code = '/* route name: protected-page */ @unsupported'
    expect(parseYamlComment(parseJSX(code, 'test.jsx'), 'protected.tsx')).toEqual({
      name: 'protected-page',
    })
  })

  it('finds a leading route block comment', () => {
    const code = `/*\n\n      route\n\nname: blog-id\nmeta:\n  id: 1\n*/\n`
    const result = parseJSX(code, 'test.jsx')
    expect(result).toHaveLength(1)
    expect(result[0].loc.start.line).toBe(1)
  })

  it('preserves the raw comment body as value', () => {
    const code = `/*\n  route\n\nname: blog-id\n*/\nimport foo from 'foo'`
    const [entry] = parseJSX(code, 'test.jsx')
    expect(entry.value).toContain('route')
    expect(entry.value).toContain('name: blog-id')
  })

  it('parses an undecorated JSDoc route block comment', () => {
    const code = `/**\nroute\nname: dashboard\n*/`
    expect(parseYamlComment(parseJSX(code, 'test.jsx'), 'test.jsx')).toEqual({
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
    expect(parseYamlComment(parseJSX(code, 'test.jsx'), 'test.jsx')).toEqual({
      name: 'dashboard',
      meta: {
        requiresAuth: true,
      },
    })
  })

  it('returns an empty array for code with no comment', () => {
    expect(parseJSX('export default {}', 'test.jsx')).toEqual([])
  })

  it('returns an empty array for an empty string', () => {
    expect(parseJSX('', 'test.jsx')).toEqual([])
  })

  it('ignores a block comment that does not start on the first line', () => {
    const code = `import foo from 'foo'\n\n/*\n  route\nname: x\n*/`
    expect(parseJSX(code, 'test.jsx')).toEqual([])
  })

  it('ignores a leading line comment before the block', () => {
    const code = `// some leading note\n/*\n  route\nname: x\n*/`
    expect(parseJSX(code, 'test.jsx')).toEqual([])
  })

  it('ignores a block comment without the route marker', () => {
    const code = `/*\nname: blog-id\nmeta:\n  id: 1\n*/`
    expect(parseJSX(code, 'test.jsx')).toEqual([])
  })

  it('ignores a block comment without any key/value colon', () => {
    const code = `/*\n  route\nno-colon-here\n*/`
    expect(parseJSX(code, 'test.jsx')).toEqual([])
  })

  it('ignores an unterminated block comment', () => {
    const code = `/*\n  route\nname: x`
    expect(parseJSX(code, 'test.jsx')).toEqual([])
  })

  it('only returns the first (leading) route comment', () => {
    const code = `/*\n  route\nname: first\n*/\n\n/*\n  route\nname: second\n*/`
    const result = parseJSX(code, 'test.jsx')
    expect(result).toHaveLength(1)
    expect(result[0].value).toContain('name: first')
    expect(result[0].value).not.toContain('name: second')
  })

  it('does not treat a bare "route" followed by a word as a marker', () => {
    const code = `/*\n  routes\nname: x\n*/`
    expect(parseJSX(code, 'test.jsx')).toEqual([])
  })

  it('stays stable across consecutive calls (lastIndex regression)', () => {
    const code = `/*\n\n      route\n\nname: blog-id\n*/\n`
    const first = parseJSX(code, 'test.jsx')
    const second = parseJSX(code, 'test.jsx')
    const third = parseJSX(code, 'test.jsx')
    expect(first).toHaveLength(1)
    expect(second).toEqual(first)
    expect(third).toEqual(first)
  })
})

describe('parseYamlComment', () => {
  it('parses a route block comment body into an object', () => {
    const code = `/*\n\n      route\n\nname: blog-id\nmeta:\n  requiresAuth: false\n  id: 1234\n*/\n`
    const result = parseYamlComment(parseJSX(code, 'test.jsx'), 'test.jsx')
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
    expect(() => parseYamlComment(parseJSX(code, 'test.jsx'), 'broken.jsx')).toThrow(/Invalid YAML format/)
  })

  it.each([
    'publishedAt: !!timestamp 2001-12-15T02:59:43.1Z',
    'data: !!binary SGVsbG8=',
    'roles: !!set\n  admin:',
  ])('rejects YAML tags outside the core schema', (routeData) => {
    const code = `/*\n  route\n${routeData}\n*/`
    expect(() => parseYamlComment(parseJSX(code, 'test.jsx'), 'tagged.jsx')).toThrow(/Invalid YAML format/)
  })

  it.each([
    'value: .inf',
    'value: .nan',
    'value: &self\n  nested: *self',
  ])('rejects route data that is not JSON-compatible', (routeData) => {
    const code = `/*\n  route\n${routeData}\n*/`
    expect(() => parseYamlComment(parseJSX(code, 'test.jsx'), 'unsupported.jsx')).toThrow(/Invalid YAML format/)
  })
})
