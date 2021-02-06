import { resolve } from 'path'
import fg from 'fast-glob'
import { ResolvedOptions } from './types'
import { extensionsToGlob, normalizePath } from './utils'

/**
 * Resolves the files that are valid pages for the given context.
 */
export async function getPagesPath(options: ResolvedOptions): Promise<string[]> {
  const {
    extensions,
    exclude,
  } = options

  const cwd = getCwd(options)
  const ext = extensionsToGlob(extensions)

  const files = await fg(`**/*.${ext}`, {
    ignore: ['node_modules', '.git', ...exclude],
    onlyFiles: true,
    cwd,
  })

  return files
}

export function getCwd(options: ResolvedOptions): string {
  const {
    root,
    pagesDir,
  } = options

  return normalizePath(resolve(root, pagesDir))
}
