import JSON5 from 'json5'
import YAML from 'yaml'

import type { SFCDescriptor, SFCBlock } from '@vue/compiler-sfc'
import type { ResolvedOptions } from './types'

export async function parseSFC(code: string): Promise<SFCDescriptor> {
  try {
    const { parse } = await import('@vue/compiler-sfc')
    return parse(code, {
      pad: 'space',
    }).descriptor
  } catch {
    throw new Error('[vite-plugin-pages] Vue3\'s "@vue/compiler-sfc" is required.')
  }
}

export function parseCustomBlock(block: SFCBlock, filePath: string, options: ResolvedOptions): any {
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
  } else if (lang === 'yaml' || lang === 'yml') {
    try {
      return YAML.parse(block.content)
    } catch (err) {
      throw new Error(`Invalid YAML format of <${block.type}> content in ${filePath}\n${err.message}`)
    }
  }
}
