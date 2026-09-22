import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    onlyBundle: ['@antfu/utils'],
  },
})
