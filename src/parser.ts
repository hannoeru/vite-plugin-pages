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
  } catch {
    throw new Error('[vite-plugin-pages] Vue3\'s "@vue/compiler-sfc" is required.')
  }
}

export function parseCustomBlock(block: CustomBlock, filePath: string, options: ResolvedOptions): any {
  const lang = block.lang ?? options.routeBlockLang

  if (lang === 'json5') {
    try {
      return JSON5.parse(block.content)
    } catch (err) {
      throw new Error(`Invalid JSON5 format of <${block.type}> content in ${filePath}\n${err.message}`)
    }
  } else if (lang === 'json') {
    try {
      return JSON.parse(block.content)
    } catch (err) {
      throw new Error(`Invalid JSON format of <${block.type}> content in ${filePath}\n${err.message}`)
    }
  } else if (lang === 'yaml') {
    try {
      return YAML.parse(block.content)
    } catch (err) {
      throw new Error(`Invalid YAML format of <${block.type}> content in ${filePath}\n${err.message}`)
    }
  }
}
