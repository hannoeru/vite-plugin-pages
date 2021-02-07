/**
 * Vue SFC Query, forked from the below:
 * - original repository url: https://github.com/vitejs/vite/tree/main/packages/plugin-vue
 * - code url: https://github.com/vitejs/vite/blob/main/packages/plugin-vue/src/utils/query.ts
 * - author: Evan You (https://github.com/yyx990803)
 * - license: MIT
 */

import qs from 'querystring'

export interface VueQuery {
  vue?: boolean
  src?: boolean
  type?: 'script' | 'template' | 'style' | 'custom' | 'route'
  index?: number
  lang?: string
}

export function parseVueRequest(id: string) {
  const [filename, rawQuery] = id.split('?', 2)
  const query = qs.parse(rawQuery) as VueQuery
  const langPart = Object.keys(query).find(key => /lang\./i.test(key))
  if (query.vue != null)
    query.vue = true

  if (query.src != null)
    query.src = true

  if (query.index != null)
    query.index = Number(query.index)

  if (langPart) {
    const [, lang] = langPart.split('.')
    query.lang = lang
  }
  return {
    filename,
    query,
  }
}
