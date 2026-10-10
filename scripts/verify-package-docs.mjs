import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = mkdtempSync(join(tmpdir(), 'vite-plugin-pages-docs-'))
const repository = 'https://github.com/hannoeru/vite-plugin-pages/blob/main/'

try {
  const [pack] = JSON.parse(execFileSync('npm', [
    'pack',
    '--ignore-scripts',
    '--json',
    '--pack-destination',
    directory,
  ], { cwd: root, encoding: 'utf8' }))
  execFileSync('tar', ['-xzf', join(directory, pack.filename), '-C', directory])

  const packageRoot = join(directory, 'package')
  const readme = readFileSync(join(packageRoot, 'README.md'), 'utf8')
  const links = [...readme.matchAll(/\]\(([^)\s]+\.md(?:#[^)\s]*)?)\)/g)]
  assert.ok(links.length > 0, 'The packed README must contain documentation links')

  const missing = []
  for (const [, link] of links) {
    const target = link.split('#')[0]
    if (target.startsWith(repository)) {
      assert.ok(existsSync(join(root, target.slice(repository.length))), `Missing repository document: ${target}`)
    }
    else if (!/^[a-z]+:/i.test(target)) {
      if (!existsSync(join(packageRoot, target)))
        missing.push(target)
    }
    else {
      assert.fail(`Unexpected documentation URL: ${target}`)
    }
  }

  assert.deepEqual(missing, [], 'The packed README has unresolved documentation links')
  console.log(`PASS: ${links.length} packed README documentation links resolve`)
}
finally {
  rmSync(directory, { recursive: true, force: true })
}
