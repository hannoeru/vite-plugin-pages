// @ts-check
/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
const config = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.[jt]s?(x)'],
  preset: 'jest-esbuild',
}

module.exports = config
