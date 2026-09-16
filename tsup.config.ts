import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
  clean: true,
  sourcemap: true,
})
