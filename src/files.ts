import type { PageOptions, ResolvedOptions } from './types'
import { join, relative, resolve } from 'node:path'
import { slash } from '@antfu/utils'
import picomatch from 'picomatch'
import { escapePath, globSync } from 'tinyglobby'

import { getPageExcludePatterns, getPagePattern, isPageExcluded } from './utils'

/**
 * Resolves the page dirs for its for its given globs
 */
export function getPageDirs(PageOptions: PageOptions, root: string, exclude: string[]): PageOptions[] {
  const dirPattern = slash(relative(root, resolve(root, PageOptions.dir))) || '.'
  const dirs = globSync(dirPattern, {
    ignore: getPageExcludePatterns({ root, exclude }),
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
  if (isPageExcluded(path, options))
    return []

  const pagePattern = getPagePattern(options, pageOptions)
  const isPage = picomatch(pagePattern, { posix: true })
  const projectRelativeDir = escapePath(slash(relative(options.root, path)))
  const pattern = projectRelativeDir ? `${projectRelativeDir}/${pagePattern}` : pagePattern
  const files = globSync(pattern, {
    ignore: getPageExcludePatterns(options),
    onlyFiles: true,
    dot: true,
    expandDirectories: false,
    cwd: options.root,
  })
    .map(p => slash(relative(path, resolve(options.root, p))))
    .filter(p => isPage(p))
    .map(p => slash(join(path, p)))

  return files
}
