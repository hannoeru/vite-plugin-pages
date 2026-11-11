import type { ResolvedOptions } from './types'
import { Script } from 'node:vm'
import { ROUTE_IMPORT_NAME } from './constants'
import { resolveImportMode } from './utils'

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
      ? `import ${importName} from ${JSON.stringify(path)}`
      : `const ${importName} = ${
        options.resolver.stringify?.dynamicImport?.(path) || `() => import(${JSON.stringify(path)})`
      }`
  }

  function stringifyComponent(path: string) {
    let importName = importsMap.get(path)

    if (!importName) {
      importName = ROUTE_IMPORT_NAME.replace('$1', `${importsMap.size}`)
      importsMap.set(path, importName)
    }

    return options.resolver.stringify?.component?.(importName) || importName
  }

  function stringifyValue(value: unknown, routePath: unknown, key: string): string | undefined {
    if (typeof value === 'function') {
      const source = value.toString()
      if (!isExpression(source))
        throw new Error(`[vite-plugin-pages] Cannot serialize "${key}" in route ${JSON.stringify(routePath)}: its function source is not an expression. Use an arrow function or a function expression.`)
      return source
    }
    if (Array.isArray(value))
      return `[${value.map((item, index) => stringifyValue(item, routePath, `${key}[${index}]`) ?? 'null').join(',')}]`
    if (isPlainObject(value))
      return stringifyObject(value, (child, childKey) => stringifyValue(child, routePath, childKey))
    return JSON.stringify(value)
  }

  function stringifyRoute(route: Record<string, unknown>): string {
    return stringifyObject(route, (value, key) => {
      if ((key === 'component' || key === 'element') && typeof value === 'string')
        return stringifyComponent(value)
      if (key === 'children' && Array.isArray(value))
        return `[${value.map(stringifyRoute).join(',')}]`
      return stringifyValue(value, route.path, key)
    })
  }

  const stringRoutes = `[${preparedRoutes.map(stringifyRoute).join(',')}]`

  const imports = Array.from(importsMap).map(args => getImportString(...args))

  return {
    imports,
    stringRoutes,
  }
}

function isExpression(source: string) {
  try {
    return new Script(`(${source})`) instanceof Script
  }
  catch {
    return false
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null)
    return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function stringifyObject(
  object: Record<string, unknown>,
  stringifyEntry: (value: unknown, key: string) => string | undefined,
) {
  const entries = Object.entries(object).flatMap(([key, value]) => {
    if (value === undefined)
      return []
    const string = stringifyEntry(value, key)
    return string === undefined
      ? []
      : [`${JSON.stringify(key)}:${string}`]
  })
  return `{${entries.join(',')}}`
}

export function generateClientCode(routes: any[], options: ResolvedOptions) {
  const { imports, stringRoutes } = stringifyRoutes(routes, options)
  const code = `${imports.join(';\n')};\n\nconst routes = ${stringRoutes};\n\nexport default routes;`
  return options.resolver.stringify?.final?.(code) || code
}
