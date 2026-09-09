import type { PageOptions, ResolvedOptions } from './types'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { globSync } from 'tinyglobby'

import { getPagePattern } from './utils'

/**
 * Resolves the page dirs for its for its given globs
 */
export function getPageDirs(PageOptions: PageOptions, root: string, exclude: string[]): PageOptions[] {
  const dirs = globSync(slash(PageOptions.dir), {
    ignore: exclude,
    onlyDirectories: true,
    dot: true,
    expandDirectories: false,
    cwd: root,
  })

  const pageDirs = dirs.map(dir => ({
    ...PageOptions,
    dir: dir.replace(/\/$/, ''),
  }))

  return pageDirs
}

/**
 * Resolves the files that are valid pages for the given context.
 */
export function getPageFiles(path: string, options: ResolvedOptions, pageOptions?: PageOptions): string[] {
  const files = globSync(getPagePattern(options, pageOptions), {
    ignore: options.exclude,
    onlyFiles: true,
    cwd: path,
  }).map(p => slash(join(path, p)))

  return files
}
