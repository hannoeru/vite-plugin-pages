import fg from 'fast-glob'
import { ResolvedOptions } from './types'
import { extensionsToGlob } from './utils'

/**
 * Resolves the files that are valid pages for the given context.
 */
export async function getPageFiles(path: string, options: ResolvedOptions): Promise<string[]> {
  const {
    extensions,
    exclude,
  } = options

  const ext = extensionsToGlob(extensions)
  const ignore = ['node_modules', '.git', '**/__*__/**', ...exclude]
  const cwds = await fg(path, {
    ignore,
    onlyDirectories: true,
    dot: true,
    unique: true,
  })

  const nestedFiles = await Promise.all(cwds.map(cwd => fg(`**/*.${ext}`, {
    ignore,
    onlyFiles: true,
    cwd,
  })))

  return nestedFiles.flat(1)
}
