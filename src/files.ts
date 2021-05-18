import fg from 'fast-glob'
import { PageDirOptions, ResolvedOptions } from './types'
import { extensionsToGlob } from './utils'

function getIgnore(exclude: string[]) {
  return ['node_modules', '.git', '**/__*__/**', ...exclude]
}

/**
 * Resolves the page dirs for its for its given globs
 */
export function getPageDirs(pageDirOptions: PageDirOptions, exclude: string[]): PageDirOptions[] {
  const dirs = fg.sync(pageDirOptions.dir, {
    ignore: getIgnore(exclude),
    onlyDirectories: true,
    dot: true,
    unique: true,
  })

  const pageDirs = dirs.map(dir => ({
    ...pageDirOptions,
    dir,
  }))

  return pageDirs
}

/**
 * Resolves the files that are valid pages for the given context.
 */
export async function getPageFiles(path: string, options: ResolvedOptions): Promise<string[]> {
  const {
    extensions,
    exclude,
  } = options

  const ext = extensionsToGlob(extensions)

  const files = await fg(`**/*.${ext}`, {
    ignore: getIgnore(exclude),
    onlyFiles: true,
    cwd: path,
  })

  return files
}
