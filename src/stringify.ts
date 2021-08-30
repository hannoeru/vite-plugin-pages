import {
  resolveImportMode,
  pathToName,
} from './utils'
import { ResolvedOptions, Route } from './types'

const componentRE = /"component":("(.*?)")/g
const hasFunctionRE = /"(?:props|beforeEnter)":("(.*?)")/g

const multilineCommentsRE = /\/\*(.|[\r\n])*?\*\//gm
const singlelineCommentsRE = /\/\/.*/g

function replaceFunction(_: any, value: any) {
  if (value instanceof Function || typeof value === 'function') {
    const fnBody = value.toString()
      .replace(multilineCommentsRE, '')
      .replace(singlelineCommentsRE, '')
      .replace(/(\t|\n|\r|\s)/g, '')

    // ES6 Arrow Function
    if (fnBody.length < 8 || fnBody.substring(0, 8) !== 'function')
      return `_NuFrRa_${fnBody}`

    return fnBody
  }

  return value
}

/**
 * Creates a stringified Vue Router route definition.
 */
export function stringifyRoutes(
  preparedRoutes: Route[],
  options: ResolvedOptions,
) {
  const imports: string[] = []

  function componentReplacer(str: string, replaceStr: string, path: string) {
    const mode = resolveImportMode(path, options)
    if (mode === 'sync') {
      const importName = pathToName(path)
      const importStr = `import ${importName} from '${path}'`

      // Only add import to array if it hasn't beed added before.
      if (!imports.includes(importStr))
        imports.push(importStr)
      return str.replace(replaceStr, importName)
    } else {
      return str.replace(replaceStr, `() => import('${path}')`)
    }
  }

  function functionReplacer(str: string, replaceStr: string, content: string) {
    if (content.startsWith('function'))
      return str.replace(replaceStr, content)

    if (content.startsWith('_NuFrRa_'))
      return str.replace(replaceStr, content.slice(8))

    return str
  }

  const stringRoutes = JSON
    .stringify(preparedRoutes, replaceFunction)
    .replace(componentRE, componentReplacer)
    .replace(hasFunctionRE, functionReplacer)

  return {
    imports,
    stringRoutes,
  }
}
