import type { ResolvedOptions } from './types'
import { ROUTE_IMPORT_NAME } from './constants'

import { resolveImportMode } from './utils'

const componentRE = /"(?:component|element)":("(.*?)")/g
const hasFunctionRE = /"(?:props|beforeEnter)":("(?:\\.|[^"\\])*")/g

function replaceFunction(_: string, value: unknown) {
  return typeof value === 'function' ? `_NuFrRa_${value.toString()}` : value
}

/**
 * Creates a stringified Vue Router route definition.
 */
export function stringifyRoutes(
  preparedRoutes: any[],
  options: ResolvedOptions,
) {
  const importsMap: Map<string, string> = new Map()

  function getImportString(path: string, importName: string) {
    const mode = resolveImportMode(path, options)
    return mode === 'sync'
      ? `import ${importName} from "${path}"`
      : `const ${importName} = ${
        options.resolver.stringify?.dynamicImport?.(path) || `() => import("${path}")`
      }`
  }

  function componentReplacer(str: string, replaceStr: string, path: string) {
    let importName = importsMap.get(path)

    if (!importName)
      importName = ROUTE_IMPORT_NAME.replace('$1', `${importsMap.size}`)

    importsMap.set(path, importName)

    importName = options.resolver.stringify?.component?.(importName) || importName

    return str.replace(replaceStr, importName)
  }

  function functionReplacer(str: string, replaceStr: string) {
    const content: string = JSON.parse(replaceStr)

    if (content.startsWith('_NuFrRa_'))
      return str.replace(replaceStr, () => content.slice(8))

    return str
  }

  const stringRoutes = JSON
    .stringify(preparedRoutes, replaceFunction)
    .replace(componentRE, componentReplacer)
    .replace(hasFunctionRE, functionReplacer)

  const imports = Array.from(importsMap).map(args => getImportString(...args))

  return {
    imports,
    stringRoutes,
  }
}

export function generateClientCode(routes: any[], options: ResolvedOptions) {
  const { imports, stringRoutes } = stringifyRoutes(routes, options)
  const code = `${imports.join(';\n')};\n\nconst routes = ${stringRoutes};\n\nexport default routes;`
  return options.resolver.stringify?.final?.(code) || code
}
