import { slugify } from '../utils/slugify';
import { stripUndefined } from '../utils/firestore';

describe('Utility Functions', () => {
  describe('slugify', () => {
    it('should convert text to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello @ World!')).toBe('hello-world');
    });

    it('should handle empty strings', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('should handle leading and trailing spaces', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });

    it('should handle numbers', () => {
      expect(slugify('Task 123')).toBe('task-123');
    });

    it('should handle consecutive special characters', () => {
      expect(slugify('hello---world')).toBe('hello-world');
    });
  });

  describe('stripUndefined', () => {
    it('removes keys with undefined values', () => {
      const result = stripUndefined({ a: 1, b: undefined, c: 'hello' });
      expect(result).toEqual({ a: 1, c: 'hello' });
      expect('b' in result).toBe(false);
    });

    it('preserves null values', () => {
      const result = stripUndefined({ a: null, b: 'test' });
      expect(result).toEqual({ a: null, b: 'test' });
    });

    it('preserves false and 0 values', () => {
      const result = stripUndefined({ a: false, b: 0, c: '' });
      expect(result).toEqual({ a: false, b: 0, c: '' });
    });

    it('handles empty object', () => {
      const result = stripUndefined({});
      expect(result).toEqual({});
    });

    it('handles object with all undefined values', () => {
      const result = stripUndefined({ a: undefined, b: undefined });
      expect(result).toEqual({});
    });

    it('preserves nested objects (shallow strip only)', () => {
      const nested = { inner: 'value' };
      const result = stripUndefined({ a: nested, b: undefined });
      expect(result).toEqual({ a: nested });
    });

    it('preserves arrays', () => {
      const result = stripUndefined({ items: [1, 2, 3], removed: undefined });
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });
});
