import { parse } from '@vue/compiler-sfc'

export interface CustomBlock {
  type: string
  content: string
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

export function tryParseCustomBlock(
  content: string,
  filePath: string,
  blockName: string): any {
  try {
    return JSON.parse(content)
  }
  catch (err) {
    const wrapped: FileError = new Error(`Invalid json format of <${blockName}> content in ${filePath}\n${err.message}`)

    // Store file path to provide useful information to downstream tools
    // like friendly-errors-webpack-plugin
    wrapped.file = filePath

    throw wrapped
  }
}
