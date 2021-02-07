import { parse } from '@vue/compiler-sfc'
import JSON5 from 'json5'
import YAML from 'yaml'

export interface CustomBlock {
  type: string
  content: string
  lang?: string
}

export interface ParseResult {
  customBlocks: CustomBlock[]
}

export function parseSFC(code: string): ParseResult {
  try {
    return parse(code, {
      pad: 'space',
    }).descriptor
  }
  catch {
    throw new Error('[vue-route-generator] Vue3\'s "@vue/compiler-sfc" is required.')
  }
}

export interface FileError extends Error {
  file?: string
}

export function tryParseCustomBlock(block: CustomBlock, filePath: string): any {
  const lang = block.lang ?? 'any'
  let valid = true
  let err: Error = new Error()
  let result: Record<string, any> = {}

  if (lang === 'json') {
    try {
      result = JSON.parse(block.content)
    }
    catch (e) {
      err = e
      valid = false
    }
  }
  else if (lang === 'json5' || lang === 'any') {
    try {
      result = JSON5.parse(block.content)
    }
    catch (e) {
      err = e
      valid = false
    }
  }

  else if (lang === 'yaml' || (lang === 'any' && !valid)) {
    try {
      result = YAML.parse(block.content)
    }
    catch (e) {
      err = e
      valid = false
    }
  }

  if (valid) return result

  const wrapped: FileError = new Error(`Invalid JSON/JSON5/YAML format of <${block.type}> content in ${filePath}\n${err.message}`)

  // Store file path to provide useful information to downstream tools
  // like friendly-errors-webpack-plugin
  wrapped.file = filePath

  throw wrapped
}
