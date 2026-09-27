import type { SFCBlock, SFCDescriptor } from '@vue/compiler-sfc'
import type { CustomBlock, ParsedJSX, ResolvedOptions } from './types'
import fs from 'node:fs'

import JSON5 from 'json5'
import { parse as YAMLParser } from 'yaml'
import { debug } from './utils'

const routeJSXReg = /^\s+(route)\s+/m

function parseLeadingBlockComment(code: string): ParsedJSX[] {
  if (!/^\uFEFF?\s*\/\*/.test(code))
    return []
  const openIdx = code.indexOf('/*')
  if (openIdx < 0 || code.slice(0, openIdx).includes('\n'))
    return []
  const closeIdx = code.indexOf('*/', openIdx + 2)
  if (closeIdx < 0)
    return []
  return [{
    value: code.slice(openIdx + 2, closeIdx),
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
      const yamlResult = YAMLParser(v)

      return {
        ...memo,
        ...yamlResult,
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
      return JSON5.parse(block.content)
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
      return YAMLParser(block.content)
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
