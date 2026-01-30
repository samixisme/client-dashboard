import { slugify } from '../utils/slugify';

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
  });
});
