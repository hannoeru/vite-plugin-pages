import {
  resolveImportMode,
  pathToName,
} from './utils'
import { ResolvedOptions, Route } from './types'

/**
 * Creates a stringified Vue Router route definition.
 */
export function stringifyRoutes(
  preparedRoutes: Route[],
  options: ResolvedOptions,
) {
  const imports: string[] = []

  const stringRoutes = JSON
    .stringify(preparedRoutes, null, 2)
    .split('\n')
    .map((str) => {
      if (str.includes('component')) {
        const start = '"component": "'
        const startIndex = str.indexOf(start) + start.length
        const endIndex = str.indexOf('",')
        const path = str.slice(startIndex, endIndex)
        const replaceStr = str.slice(startIndex - 1, endIndex + 1)

        const mode = resolveImportMode(path, options)
        if (mode === 'sync') {
          const importName = pathToName(path)
          imports.push(`import ${importName} from '${path}'`)
          return str.replace(replaceStr, importName)
        }
        else {
          return str.replace(replaceStr, `() => import('${path}')`)
        }
      }
      return str
    }).join('\n')

  return {
    imports,
    stringRoutes,
  }
}
