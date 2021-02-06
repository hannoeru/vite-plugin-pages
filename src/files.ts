import { resolve } from 'path'
import fg from 'fast-glob'
import { ResolvedOptions } from './types'
import { extensionsToGlob, normalizePath } from './utils'

/**
 * Resolves the files that are valid pages for the given context.
 */
export async function getPagesPath(options: ResolvedOptions): Promise<string[]> {
  const {
    root,
    pagesDir,
    extensions,
    exclude,
  } = options

  const cwd = normalizePath(resolve(root, pagesDir))
  const ext = extensionsToGlob(extensions)

  const files = await fg(`**/*.${ext}`, {
    ignore: ['node_modules', '.git', '**/__*__/*', ...exclude],
    onlyFiles: true,
    cwd,
  })

  return files
}
