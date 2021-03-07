module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.[jt]s?(x)'],
  transform: {
    '^.+\\.tsx?$': 'jest-esbuild',
  },
}
