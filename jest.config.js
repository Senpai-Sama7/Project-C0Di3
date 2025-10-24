/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!eslint.config.js'
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testTimeout: 30000,
  maxWorkers: '50%',
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        skipLibCheck: true
      }
    }
  },
  verbose: true,
  collectCoverage: false, // Only collect when explicitly requested
  bail: false,
  detectOpenHandles: true,
  forceExit: false
};
