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
