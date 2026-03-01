import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Use jsdom environment for React component testing
  testEnvironment: 'jsdom',

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Module name mapper for CSS, assets, and Firebase mocks
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^firebase/app$': '<rootDir>/__mocks__/firebase/app.ts',
    '^firebase/app-check$': '<rootDir>/__mocks__/firebase/app-check.ts',
    '^firebase/auth$': '<rootDir>/__mocks__/firebase/auth.ts',
    '^firebase/firestore$': '<rootDir>/__mocks__/firebase/firestore.ts',
    '^firebase/storage$': '<rootDir>/__mocks__/firebase/storage.ts',
    '^\\.\\./utils/firebase$': '<rootDir>/__mocks__/utils/firebase.ts',
    '^\\.\\./\\.\\./utils/firebase$': '<rootDir>/__mocks__/utils/firebase.ts',
    '^\\./utils/firebase$': '<rootDir>/__mocks__/utils/firebase.ts',
    '^\\.\/firebase$': '<rootDir>/__mocks__/utils/firebase.ts',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'api/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/index.ts',
    '!utils/firebase.ts',
    '!api/logger.ts',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.{spec,test}.{ts,tsx}',
  ],

  // Transform files with ts-jest
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
    '^.+\\.(js|jsx|mjs)$': 'babel-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/e2e/'],
  
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|cheerio|undici|node-fetch|fetch-blob|formdata-polyfill)'
  ],

  // Exclude skill directories from module resolution to avoid naming collisions
  modulePathIgnorePatterns: [
    '<rootDir>/.agent/',
    '<rootDir>/.claude/',
    '<rootDir>/.gemini/',
  ],

  // Verbose output
  verbose: true,
};

export default config;

