import { validateUrl, validateId } from '../api/urlValidator';

describe('urlValidator', () => {
  describe('validateUrl', () => {
    it('accepts valid https URL', () => {
      expect(validateUrl('https://example.com')).toEqual({ isValid: true });
    });

    it('accepts valid http URL', () => {
      expect(validateUrl('http://example.com/page?q=1')).toEqual({ isValid: true });
    });

    it('blocks 127.0.0.1 (loopback)', () => {
      const result = validateUrl('http://127.0.0.1');
      expect(result.isValid).toBe(false);
    });

    it('blocks 10.x.x.x (private class A)', () => {
      const result = validateUrl('http://10.0.0.1');
      expect(result.isValid).toBe(false);
    });

    it('blocks 172.16-31.x.x (private class B)', () => {
      expect(validateUrl('http://172.16.0.1').isValid).toBe(false);
      expect(validateUrl('http://172.31.255.255').isValid).toBe(false);
    });

    it('blocks 192.168.x.x (private class C)', () => {
      const result = validateUrl('http://192.168.1.1');
      expect(result.isValid).toBe(false);
    });

    it('blocks 169.254.169.254 (AWS/GCP metadata)', () => {
      const result = validateUrl('http://169.254.169.254');
      expect(result.isValid).toBe(false);
    });

    it('blocks localhost', () => {
      const result = validateUrl('http://localhost');
      expect(result.isValid).toBe(false);
    });

    it('blocks 0.0.0.0', () => {
      const result = validateUrl('http://0.0.0.0');
      expect(result.isValid).toBe(false);
    });

    it('blocks metadata.google.internal', () => {
      const result = validateUrl('http://metadata.google.internal');
      expect(result.isValid).toBe(false);
    });

    it('rejects ftp:// protocol', () => {
      const result = validateUrl('ftp://example.com/file');
      expect(result.isValid).toBe(false);
    });

    it('rejects URLs with embedded credentials', () => {
      const result = validateUrl('http://user:pass@example.com');
      expect(result.isValid).toBe(false);
    });

    it('rejects empty string', () => {
      const result = validateUrl('');
      expect(result.isValid).toBe(false);
    });

    it('rejects malformed URL', () => {
      const result = validateUrl('not-a-url');
      expect(result.isValid).toBe(false);
    });

    it('blocks port 0', () => {
      const result = validateUrl('http://example.com:0');
      expect(result.isValid).toBe(false);
    });

    it('blocks IPv6 loopback ::1', () => {
      const result = validateUrl('http://[::1]:8080');
      expect(result.isValid).toBe(false);
    });

    it('blocks IPv4-mapped IPv6 loopback addresses', () => {
      const result = validateUrl('http://[::ffff:127.0.0.1]');
      expect(result.isValid).toBe(false);
      const result2 = validateUrl('http://[::ffff:7f00:1]');
      expect(result2.isValid).toBe(false);
    });

    it('rejects IPv6 ULA fc00:', () => {
      const result = validateUrl('http://[fc00::1]');
      expect(result.isValid).toBe(false);
    });

    it('rejects IPv6 ULA fd00:', () => {
      const result = validateUrl('http://[fd00::1]');
      expect(result.isValid).toBe(false);
    });

    it('rejects IPv6 link-local fe80:', () => {
      const result = validateUrl('http://[fe80::1]');
      expect(result.isValid).toBe(false);
    });

    it('blocks IPv6 unspecified address ::', () => {
      const result = validateUrl('http://[::]');
      expect(result.isValid).toBe(false);
    });

    it('blocks IPv6 unspecified address 0000:', () => {
      const result = validateUrl('http://[0000:0000:0000:0000:0000:0000:0000:0000]');
      expect(result.isValid).toBe(false);
    });

    it('blocks 0.x.x.x range', () => {
      const result = validateUrl('http://0.1.2.3');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateId', () => {
    it('accepts alphanumeric ID', () => {
      expect(validateId('abc123')).toBe(true);
    });

    it('accepts ID with hyphens and underscores', () => {
      expect(validateId('my-project_id-123')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(validateId('')).toBe(false);
    });

    it('rejects null', () => {
      expect(validateId(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(validateId(undefined)).toBe(false);
    });

    it('rejects non-string (number)', () => {
      expect(validateId(42)).toBe(false);
    });

    it('rejects ID with special characters', () => {
      expect(validateId('id@with!special')).toBe(false);
    });

    it('rejects ID with spaces', () => {
      expect(validateId('has space')).toBe(false);
    });

    it('rejects ID with dots', () => {
      expect(validateId('has.dot')).toBe(false);
    });
  });

  describe('validateId strict length checks', () => {
    it('accepts valid short ID', () => {
      expect(validateId('abc-123')).toBe(true);
    });

    it('rejects invalid characters even if short', () => {
      expect(validateId('bad@id')).toBe(false);
    });
  });
});
