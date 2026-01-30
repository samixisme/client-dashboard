import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Use jsdom environment for React component testing
  testEnvironment: 'jsdom',

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Module name mapper for CSS and asset imports
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],

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
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

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
