import { parseJSX, parseYamlComment } from '../src/customBlock'

const routeBlock = '/*\nroute\nname: protected-page\nmeta:\n  requiresAuth: true\n*/'
const metadata = { name: 'protected-page', meta: { requiresAuth: true } }

describe.each(['jsx', 'tsx', 'ts'])('default export in %s', (extension) => {
  it.each([
    String.raw`/["/]/`,
    String.raw`/[/*]/`,
    String.raw`/\/\*/`,
    '/path/',
  ])('preserves route metadata after regex %s', (pattern) => {
    const path = `page.${extension}`
    const code = `export default ${pattern}.test(location.pathname) ? Foo : Bar; ${routeBlock}`
    expect(parseYamlComment(parseJSX(code, path), path)).toEqual(metadata)
  })

  it('does not treat the default property as a regex operand', () => {
    const path = `page.${extension}`
    const code = `const value = { default: 10 }.default / 2; ${routeBlock}`
    expect(parseYamlComment(parseJSX(code, path), path)).toEqual(metadata)
  })

  it('does not select a route comment on the next line', () => {
    const path = `page.${extension}`
    const code = `export default /[/*]/.test(location.pathname) ? Foo : Bar;\n${routeBlock}`
    expect(parseJSX(code, path)).toEqual([])
  })
})
