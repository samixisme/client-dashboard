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
  const hostname = parsedUrl.hostname.toLowerCase();
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
