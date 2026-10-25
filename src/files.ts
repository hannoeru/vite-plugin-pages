import type { PageOptions, ResolvedOptions } from './types'
import { join, relative, resolve } from 'node:path'
import { slash } from '@antfu/utils'
import picomatch from 'picomatch'
import { globSync } from 'tinyglobby'

import { getPageExcludePatterns, getPagePattern } from './utils'

/**
 * Resolves the page dirs for its for its given globs
 */
export function getPageDirs(PageOptions: PageOptions, root: string): PageOptions[] {
  const dirPattern = slash(relative(root, resolve(root, PageOptions.dir))) || '.'
  const dirs = globSync(dirPattern, {
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
  const pagePattern = getPagePattern(options, pageOptions)
  const isPage = picomatch(pagePattern, { posix: true })
  const files = globSync(getPagePattern(options), {
    ignore: getPageExcludePatterns(options.exclude),
    onlyFiles: true,
    dot: true,
    expandDirectories: false,
    cwd: path,
  })
    .filter(p => isPage(p))
    .map(p => slash(join(path, p)))

  return files
}
