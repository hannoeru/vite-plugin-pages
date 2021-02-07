import { parse } from '@vue/compiler-sfc'
import JSON5 from 'json5'
import YAML from 'yaml'
import { ResolvedOptions } from './types'

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

export function tryParseCustomBlock(block: CustomBlock, filePath: string, options: ResolvedOptions): any {
  const lang = block.lang ?? options.routeBlockLang

  if (lang === 'json5') {
    try {
      return JSON5.parse(block.content)
    }
    catch (err) {
      const wrapped: FileError = new Error(`Invalid JSON5 format of <${block.type}> content in ${filePath}\n${err.message}`)

      // Store file path to provide useful information to downstream tools
      // like friendly-errors-webpack-plugin
      wrapped.file = filePath
      throw wrapped
    }
  }
  else if (lang === 'json') {
    try {
      return JSON.parse(block.content)
    }
    catch (err) {
      const wrapped: FileError = new Error(`Invalid JSON format of <${block.type}> content in ${filePath}\n${err.message}`)
      wrapped.file = filePath
      throw wrapped
    }
  }

  else if (lang === 'yaml') {
    try {
      return YAML.parse(block.content)
    }
    catch (err) {
      const wrapped: FileError = new Error(`Invalid YAML format of <${block.type}> content in ${filePath}\n${err.message}`)
      wrapped.file = filePath
      throw wrapped
    }
  }
}
