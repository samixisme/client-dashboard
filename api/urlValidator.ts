import { URL } from 'url';
import validator from 'validator';

// Private IP ranges that should be blocked
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  // IPv4-mapped IPv6 addresses (decimal)
  /^::ffff:10\./,
  /^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^::ffff:192\.168\./,
  /^::ffff:127\./,
  /^::ffff:0\./,
  /^::ffff:169\.254\./,
  // IPv4-mapped IPv6 addresses (hex)
  /^::ffff:0a[0-9a-f]{2}:/i,
  /^::ffff:ac1[0-f]:/i,
  /^::ffff:c0a8:/i,
  /^::ffff:7f[0-9a-f]{2}:/i,
  /^::ffff:0000:/i,
  /^::ffff:a9fe:/i,
  // Basic IPv6 variations for loopback/unspecified
  /^0:0:0:0:0:0:0:1$/,
  /^::$/,
  /^0:0:0:0:0:0:0:0$/,
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254', // AWS/GCP metadata
];

/**
 * Validates a URL to prevent SSRF attacks
 * @param urlString - The URL to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateUrl(urlString: string): { isValid: boolean; error?: string } {
  // Basic format validation
  if (!validator.isURL(urlString, { protocols: ['http', 'https'], require_protocol: true })) {
    return { isValid: false, error: 'Invalid URL format. Only http and https protocols are allowed.' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    return { isValid: false, error: 'Malformed URL' };
  }

  // Only allow http and https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  // Block localhost variations
  // Strip brackets from IPv6 for regex matching
  const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { isValid: false, error: 'Access to this hostname is not allowed' };
  }

  // Block private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return { isValid: false, error: 'Access to private IP addresses is not allowed' };
    }
  }

  // Block URLs with credentials
  if (parsedUrl.username || parsedUrl.password) {
    return { isValid: false, error: 'URLs with embedded credentials are not allowed' };
  }

  return { isValid: true };
}

/**
 * Validates projectId and feedbackId parameters
 * @param value - The value to validate
 * @returns boolean indicating if valid
 */
export function validateId(value: unknown): boolean {
  if (!value) return false;
  if (typeof value !== 'string') return false;
  // Allow alphanumeric, hyphens, and underscores (common ID formats)
  return /^[a-zA-Z0-9_-]+$/.test(value);
}
