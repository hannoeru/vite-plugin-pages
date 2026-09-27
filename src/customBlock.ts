import type { SFCBlock, SFCDescriptor } from '@vue/compiler-sfc'
import type { CustomBlock, ParsedJSX, ResolvedOptions } from './types'
import fs from 'node:fs'

import { parseJSON5 } from 'confbox/json5'
import { parseYAML } from 'confbox/yaml'
import { debug } from './utils'

const routeJSXReg = /^\s+(route)\s+/m

function assertJSONCompatible(value: unknown, ancestors = new WeakSet<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return
  if (typeof value === 'number') {
    if (Number.isFinite(value))
      return
    throw new TypeError('Route YAML numbers must be finite')
  }
  if (typeof value !== 'object')
    throw new TypeError(`Route YAML does not support ${typeof value} values`)

  const prototype = Object.getPrototypeOf(value)
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null)
    throw new TypeError('Route YAML supports only arrays and plain objects')
  if (ancestors.has(value))
    throw new TypeError('Route YAML does not support circular aliases')

  ancestors.add(value)
  for (const item of Array.isArray(value) ? value : Object.values(value))
    assertJSONCompatible(item, ancestors)
  ancestors.delete(value)
}

function parseRouteYAML<T>(code: string): T | null {
  const isEmptyDocument = code
    .split(/\r?\n/)
    .every(line => /^\s*(?:#.*)?$/.test(line))
  if (isEmptyDocument)
    return null

  const value = parseYAML<T>(code)
  assertJSONCompatible(value)
  return value
}

function parseLeadingBlockComment(code: string): ParsedJSX[] {
  if (!/^\s*\/\*/.test(code))
    return []
  const openIdx = code.indexOf('/*')
  if (openIdx < 0 || code.slice(0, openIdx).includes('\n'))
    return []
  const closeIdx = code.indexOf('*/', openIdx + 2)
  if (closeIdx < 0)
    return []
  const contentStart = code.startsWith('/**', openIdx) ? openIdx + 3 : openIdx + 2
  const rawValue = code.slice(contentStart, closeIdx)
  const isDecorated = rawValue
    .split('\n')
    .some(line => /^[\t ]*\*[\t ]*route[\t ]*\r?$/.test(line))
  const value = isDecorated
    ? rawValue.replace(/^[\t ]*\*[\t ]?/gm, '')
    : rawValue
  return [{
    value,
    loc: { start: { line: 1 } },
  }]
}

export function parseJSX(code: string): ParsedJSX[] {
  return parseLeadingBlockComment(code).filter(
    c => routeJSXReg.test(c.value) && c.value.includes(':') && c.loc.start.line === 1,
  )
}

export function parseYamlComment(code: ParsedJSX[], path: string): CustomBlock {
  return code.reduce((memo, item) => {
    const { value } = item
    const v = value.replace(routeJSXReg, '')
    debug.routeBlock(`use ${v} parser`)
    try {
      const yamlResult = parseRouteYAML<Record<string, unknown>>(v)

      return {
        ...memo,
        ...(yamlResult ?? {}),
      }
    }
    catch (err: any) {
      throw new Error(`Invalid YAML format of comment in ${path}\n${err.message}`)
    }
  }, {})
}

export async function parseSFC(code: string): Promise<SFCDescriptor> {
  try {
    const { parse } = await import('@vue/compiler-sfc')
    return parse(code, {
      pad: 'space',
    }).descriptor
    // for @vue/compiler-sfc ^2.7
    || (parse as any)({
      source: code,
    })
  }
  catch {
    throw new Error('[vite-plugin-pages] Vue3\'s "@vue/compiler-sfc" is required.')
  }
}

export function parseCustomBlock(block: SFCBlock, filePath: string, options: ResolvedOptions): any {
  const lang = block.lang ?? options.routeBlockLang

  debug.routeBlock(`use ${lang} parser`)

  if (lang === 'json5') {
    try {
      return parseJSON5(block.content)
    }
    catch (err: any) {
      throw new Error(`Invalid JSON5 format of <${block.type}> content in ${filePath}\n${err.message}`)
    }
  }
  else if (lang === 'json') {
    try {
      return JSON.parse(block.content)
    }
    catch (err: any) {
      throw new Error(`Invalid JSON format of <${block.type}> content in ${filePath}\n${err.message}`)
    }
  }
  else if (lang === 'yaml' || lang === 'yml') {
    try {
      return parseRouteYAML(block.content)
    }
    catch (err: any) {
      throw new Error(`Invalid YAML format of <${block.type}> content in ${filePath}\n${err.message}`)
    }
  }
}

export async function getRouteBlock(path: string, options: ResolvedOptions) {
  const content = fs.readFileSync(path, 'utf8')

  const parsedSFC = await parseSFC(content)
  const blockStr = parsedSFC?.customBlocks.find(b => b.type === 'route')

  const parsedJSX = parseJSX(content)

  if (!blockStr && parsedJSX.length === 0)
    return

  let result

  if (blockStr)
    result = parseCustomBlock(blockStr, path, options) as CustomBlock

  if (parsedJSX.length > 0)
    result = parseYamlComment(parsedJSX, path) as CustomBlock

  return result
}
