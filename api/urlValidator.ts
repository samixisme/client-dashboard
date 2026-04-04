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
  // IPv4-mapped IPv6 addresses (covers both decimal and hex forms)
  /^::ffff:(0*127)\./, // 127.x.x.x (decimal)
  /^::ffff:(0*10)\./, // 10.x.x.x (decimal)
  /^::ffff:(0*172)\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16-31.x.x (decimal)
  /^::ffff:(0*192)\.(0*168)\./, // 192.168.x.x (decimal)
  /^::ffff:(0*169)\.(0*254)\./, // 169.254.x.x (decimal)
  /^::ffff:0*\./, // 0.x.x.x (decimal)
  /^::ffff:0*7f[0-9a-f]{2}:/i, // 127.x.x.x (hex)
  /^::ffff:0*0?a[0-9a-f]{2}:/i, // 10.x.x.x (hex)
  /^::ffff:0*ac1[0-f]:/i, // 172.16-31.x.x (hex)
  /^::ffff:0*c0a8:/i, // 192.168.x.x (hex)
  /^::ffff:0*a9fe:/i, // 169.254.x.x (hex)
  /^::ffff:0*0000:/i, // 0.x.x.x (hex)
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
  let hostname = parsedUrl.hostname.toLowerCase();
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

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
