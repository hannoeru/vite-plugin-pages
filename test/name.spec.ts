import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import glob from 'fast-glob'
import { build } from 'vite'
import Pages from '../src/index'

describe('Component name', async() => {
  const root = resolve(__dirname, '..')
  const files = await glob('./examples/vue/src/pages/**/*.{vue,js,ts}', {
    cwd: root,
    onlyFiles: true,
  })

  for (const file of files) {
    it(file.replace(/\\/g, '/'), async() => {
      const filepath = resolve(root, file)
      const dir = resolve(__dirname, '../examples/vue/src/pages')

      const bundle = await build({
        root: dir,
        build: {
          sourcemap: false,
          write: false,
          lib: {
            entry: filepath,
            formats: ['es'],
            name: filepath,
          },
        },
        plugins: [
          Pages({
            dirs: [
              { dir, baseRoute: '' },
            ],
            extensions: ['vue'],
          }),
          {
            name: 'to-string',
            async buildStart({ plugins }) {
              await plugins.find(i => i.name === 'vite-plugin-pages')?.api.getResolvedRoutes()
            },
            transform: code => `export default \`${code.replace(/`/g, '\\`')}\``,
          },
        ],
      })
      if (!Array.isArray(bundle))
        return

      const code = bundle[0].output
        .map(file => (file.type === 'chunk' ? file.code : file.fileName))
        .join('\n')
      expect(code).toMatchSnapshot()
    })
  }
})
