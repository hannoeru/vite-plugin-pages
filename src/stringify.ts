import {
  resolveImportMode,
  pathToName,
} from './utils'
import { ResolvedOptions, Route } from './types'

function replacer(_: any, value: any) {
  if (value instanceof Function || typeof value === 'function') {
    const fnBody = value.toString()

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

  const stringRoutes = JSON
    .stringify(preparedRoutes, replacer, 2)
    .split('\n')
    .map((str) => {
      if (/"component":\s"\S+"/.test(str)) {
        const start = '"component": "'
        const startIndex = str.indexOf(start) + start.length
        const endIndex = str.endsWith('",') ? str.length - 2 : str.length - 1
        const path = str.slice(startIndex, endIndex)
        const replaceStr = str.slice(startIndex - 1, endIndex + 1)

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
      if (/"props":\s"[^"]+"/.test(str)) {
        const start = '"props": "'
        const startIndex = str.indexOf(start) + start.length
        const endIndex = str.endsWith('",') ? str.length - 2 : str.length - 1
        const content = str.slice(startIndex, endIndex)
        const replaceStr = str.slice(startIndex - 1, endIndex + 1)

        if (content.startsWith('function'))
          return str.replace(replaceStr, content)

        if (content.startsWith('_NuFrRa_'))
          return str.replace(replaceStr, content.slice(8))
      }
      return str
    }).join('\n')

  return {
    imports,
    stringRoutes,
  }
}
