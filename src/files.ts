import { join } from 'path'
import { slash } from '@antfu/utils'
import fg from 'fast-glob'
import { extsToGlob } from './utils'

import type { PageOptions, ResolvedOptions } from './types'

/**
 * Resolves the page dirs for its for its given globs
 */
export function getPageDirs(PageOptions: PageOptions, root: string, exclude: string[]): PageOptions[] {
  const dirs = fg.sync(slash(PageOptions.dir), {
    ignore: exclude,
    onlyDirectories: true,
    dot: true,
    unique: true,
    cwd: root,
  })

  const pageDirs = dirs.map(dir => ({
    ...PageOptions,
    dir,
  }))

  return pageDirs
}

/**
 * Resolves the files that are valid pages for the given context.
 */
export function getPageFiles(path: string, options: ResolvedOptions): string[] {
  const {
    exclude,
    extensions,
  } = options

  const ext = extsToGlob(extensions)

  const files = fg.sync(slash(join(path, `**/*.${ext}`)), {
    ignore: exclude,
    onlyFiles: true,
  })

  return files
}
