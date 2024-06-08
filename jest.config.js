/**  @type {import('@jest/types').Config.ProjectConfig} */
const config = {
  transform: {
    '\\.[jt]s?$': ['ts-jest', { useESM: true, tsconfig: { allowJs: true } }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.[jt]s$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['<rootDir>/tests/**/?(*.)+(spec|test).ts'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test-setup.js'],
}

export default config
