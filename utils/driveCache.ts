import * as fs from 'fs';
import * as path from 'path';

// Cache directory
const CACHE_DIR = path.join(__dirname, '..', '.cache', 'drive');

// Ensure cache directory exists
const ensureCacheDir = (): void => {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
};

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Get cached data
 */
export const getDriveCache = async <T>(key: string): Promise<T | null> => {
  try {
    ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${key}.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const entry: CacheEntry<T> = JSON.parse(content);

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      // Expired, delete cache file
      fs.unlinkSync(filePath);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error(`Cache read error for key ${key}:`, error);
    return null;
  }
};

/**
 * Set cached data with TTL (time to live in seconds)
 */
export const setDriveCache = async <T>(
  key: string,
  data: T,
  ttl: number
): Promise<void> => {
  try {
    ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${key}.json`);

    if (data === null || ttl === 0) {
      // Delete cache entry
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return;
    }

    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttl * 1000,
    };

    fs.writeFileSync(filePath, JSON.stringify(entry), 'utf8');
  } catch (error) {
    console.error(`Cache write error for key ${key}:`, error);
  }
};

/**
 * Get folder ID from cache (24-hour TTL)
 */
export const getFolderCache = async (folderPath: string): Promise<string | null> => {
  return getDriveCache<string>(`folder:${folderPath}`);
};

/**
 * Set folder ID in cache (24-hour TTL)
 */
export const setFolderCache = async (folderPath: string, folderId: string): Promise<void> => {
  await setDriveCache(`folder:${folderPath}`, folderId, 86400); // 24 hours
};

/**
 * Clear all cache
 */
export const clearCache = (): void => {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
      console.log('✅ Cache cleared');
    }
  } catch (error) {
    console.error('Cache clear error:', error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = (): {
  totalEntries: number;
  totalSize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
} => {
  ensureCacheDir();

  const files = fs.readdirSync(CACHE_DIR);
  let totalSize = 0;
  let oldestTime = Infinity;
  let newestTime = 0;

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;

    const mtime = stats.mtime.getTime();
    if (mtime < oldestTime) oldestTime = mtime;
    if (mtime > newestTime) newestTime = mtime;
  }

  return {
    totalEntries: files.length,
    totalSize,
    oldestEntry: oldestTime !== Infinity ? new Date(oldestTime) : null,
    newestEntry: newestTime !== 0 ? new Date(newestTime) : null,
  };
};

/**
 * Clean expired cache entries
 */
export const cleanExpiredCache = (): number => {
  ensureCacheDir();

  const files = fs.readdirSync(CACHE_DIR);
  let deletedCount = 0;

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const entry: CacheEntry<any> = JSON.parse(content);

      if (Date.now() > entry.expiresAt) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    } catch (error) {
      // Invalid cache file, delete it
      fs.unlinkSync(filePath);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`🧹 Cleaned ${deletedCount} expired cache entries`);
  }

  return deletedCount;
};

// Schedule automatic cache cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanExpiredCache();
  }, 3600000); // 1 hour
}
