import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.[jt]s?(x)'],
  preset: 'jest-esbuild',
}

export default config
