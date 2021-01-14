import { stringifyRoutes } from './stringify'
import { generateRoutes } from './generate'
import { Options } from './types'

export function generateClientCode(filesPath: string[], options: Options) {
  const routes = generateRoutes(filesPath, options)
  const { imports, stringRoutes } = stringifyRoutes(routes, options)

  return `${imports.join('\n')}\n\nconst routes = ${stringRoutes}\n\nexport default routes`
}
