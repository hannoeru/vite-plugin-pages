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
    // eslint-disable-next-line no-eval
    const parse = eval('require')('@vue/compiler-sfc').parse as typeof import('@vue/compiler-sfc').parse
    return parse(code, {
      pad: 'space',
    }).descriptor
  } catch {
    throw new Error('[vite-plugin-pages] Vue3\'s "@vue/compiler-sfc" is required.')
  }
}

let JSON5: typeof import('json5')
let YAML: typeof import('yaml')

export function parseCustomBlock(block: CustomBlock, filePath: string, options: ResolvedOptions): any {
  const lang = block.lang ?? options.routeBlockLang

  if (lang === 'json5') {
    try {
      if (!JSON5) {
        // eslint-disable-next-line no-eval
        JSON5 = eval('require')('json5')
      }

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
  } else if (lang === 'yaml' || lang === 'yml') {
    try {
      if (!YAML) {
        // eslint-disable-next-line no-eval
        YAML = eval('require')('yaml')
      }
      return YAML.parse(block.content)
    } catch (err) {
      throw new Error(`Invalid YAML format of <${block.type}> content in ${filePath}\n${err.message}`)
    }
  }
}
