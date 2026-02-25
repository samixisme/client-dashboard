import { TextEncoder, TextDecoder } from 'util';
import 'whatwg-fetch';
import { ReadableStream } from 'stream/web';
Object.assign(global, { TextDecoder, TextEncoder, ReadableStream });

// Jest setup file - runs before each test suite
import '@testing-library/jest-dom';

// Guard browser-only mocks — skip when running in node environment (API integration tests)
if (typeof window !== 'undefined') {
  // Mock window.matchMedia (commonly needed for responsive components)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock scrollTo (used in many components)
  window.scrollTo = jest.fn();
}

// Mock IntersectionObserver (needed for lazy loading components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
