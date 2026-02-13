// Google Drive Quota Management
// Google One (2TB) has a 750GB daily upload limit

const DAILY_UPLOAD_LIMIT = 750 * 1024 * 1024 * 1024; // 750GB in bytes
const RATE_LIMIT_PER_MINUTE = 1000; // 1000 requests per minute

interface QuotaState {
  dailyUploadBytes: number;
  lastResetDate: string;
  requestsThisMinute: number;
  lastRequestMinute: string;
}

// In-memory quota tracking (persists across requests within same process)
let quotaState: QuotaState = {
  dailyUploadBytes: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  requestsThisMinute: 0,
  lastRequestMinute: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
};

/**
 * Reset daily quota at midnight UTC
 */
const resetDailyQuotaIfNeeded = (): void => {
  const today = new Date().toISOString().split('T')[0];

  if (quotaState.lastResetDate !== today) {
    quotaState.dailyUploadBytes = 0;
    quotaState.lastResetDate = today;
    console.log(`📊 Daily quota reset for ${today}`);
  }
};

/**
 * Reset rate limit counter every minute
 */
const resetRateLimitIfNeeded = (): void => {
  const currentMinute = new Date().toISOString().slice(0, 16);

  if (quotaState.lastRequestMinute !== currentMinute) {
    quotaState.requestsThisMinute = 0;
    quotaState.lastRequestMinute = currentMinute;
  }
};

/**
 * Check if we can upload a file of given size
 */
export const canUpload = (fileSizeBytes: number): boolean => {
  resetDailyQuotaIfNeeded();
  resetRateLimitIfNeeded();

  // Check daily quota
  if (quotaState.dailyUploadBytes + fileSizeBytes > DAILY_UPLOAD_LIMIT) {
    console.warn(
      `⚠️ Daily quota exceeded. Used: ${formatBytes(quotaState.dailyUploadBytes)}, ` +
      `Attempting: ${formatBytes(fileSizeBytes)}, ` +
      `Limit: ${formatBytes(DAILY_UPLOAD_LIMIT)}`
    );
    return false;
  }

  // Check rate limit
  if (quotaState.requestsThisMinute >= RATE_LIMIT_PER_MINUTE) {
    console.warn(
      `⚠️ Rate limit exceeded. Requests this minute: ${quotaState.requestsThisMinute}, ` +
      `Limit: ${RATE_LIMIT_PER_MINUTE}`
    );
    return false;
  }

  return true;
};

/**
 * Track an upload (call after successful upload)
 */
export const trackUpload = (fileSizeBytes: number): void => {
  resetDailyQuotaIfNeeded();
  resetRateLimitIfNeeded();

  quotaState.dailyUploadBytes += fileSizeBytes;
  quotaState.requestsThisMinute += 1;

  const percentUsed = (quotaState.dailyUploadBytes / DAILY_UPLOAD_LIMIT) * 100;

  if (percentUsed > 80) {
    console.warn(
      `⚠️ Daily quota at ${percentUsed.toFixed(1)}% (${formatBytes(quotaState.dailyUploadBytes)} / ${formatBytes(DAILY_UPLOAD_LIMIT)})`
    );
  }
};

/**
 * Get remaining daily quota in bytes
 */
export const getRemainingQuota = (): number => {
  resetDailyQuotaIfNeeded();
  return Math.max(0, DAILY_UPLOAD_LIMIT - quotaState.dailyUploadBytes);
};

/**
 * Get quota usage statistics
 */
export const getQuotaStats = (): {
  dailyUploadBytes: number;
  dailyUploadLimit: number;
  percentUsed: number;
  remainingBytes: number;
  requestsThisMinute: number;
  rateLimit: number;
  lastResetDate: string;
} => {
  resetDailyQuotaIfNeeded();
  resetRateLimitIfNeeded();

  const percentUsed = (quotaState.dailyUploadBytes / DAILY_UPLOAD_LIMIT) * 100;

  return {
    dailyUploadBytes: quotaState.dailyUploadBytes,
    dailyUploadLimit: DAILY_UPLOAD_LIMIT,
    percentUsed,
    remainingBytes: getRemainingQuota(),
    requestsThisMinute: quotaState.requestsThisMinute,
    rateLimit: RATE_LIMIT_PER_MINUTE,
    lastResetDate: quotaState.lastResetDate,
  };
};

/**
 * Format bytes to human-readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Reset quota (for testing purposes only)
 */
export const resetQuota = (): void => {
  quotaState = {
    dailyUploadBytes: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    requestsThisMinute: 0,
    lastRequestMinute: new Date().toISOString().slice(0, 16),
  };
  console.log('🔄 Quota manually reset');
};

/**
 * Check if we're approaching quota limits
 */
export const getQuotaWarnings = (): string[] => {
  resetDailyQuotaIfNeeded();
  resetRateLimitIfNeeded();

  const warnings: string[] = [];
  const percentUsed = (quotaState.dailyUploadBytes / DAILY_UPLOAD_LIMIT) * 100;

  if (percentUsed >= 90) {
    warnings.push(`CRITICAL: Daily quota at ${percentUsed.toFixed(1)}%`);
  } else if (percentUsed >= 75) {
    warnings.push(`WARNING: Daily quota at ${percentUsed.toFixed(1)}%`);
  }

  const ratePercentUsed = (quotaState.requestsThisMinute / RATE_LIMIT_PER_MINUTE) * 100;
  if (ratePercentUsed >= 80) {
    warnings.push(`WARNING: Rate limit at ${ratePercentUsed.toFixed(1)}% this minute`);
  }

  return warnings;
};
