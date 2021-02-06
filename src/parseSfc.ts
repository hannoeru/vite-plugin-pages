import type { parse as _parserV3 } from '@vue/compiler-sfc';

export interface CustomBlock {
  type: string
  content: string
}

export interface ParseResult {
  customBlocks: CustomBlock[]
}

export function parseSFC(code: string): ParseResult {
  try {
    const parserV3: typeof _parserV3 = require('@vue/compiler-sfc').parse
    return parserV3(code, {
      pad: 'space',
    }).descriptor
  } catch {
    throw new Error('[vue-route-generator] Vue3\'s "@vue/compiler-sfc" is required.')
  }
}
