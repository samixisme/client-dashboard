import { SocialPost, SocialAccount, PlatformOverview, ScheduledPost, SocialAnomaly } from '../types';

export type ExportFormat = 'json' | 'csv';

interface ExportOptions {
  format: ExportFormat;
  filename?: string;
}

/**
 * Export social media data to JSON or CSV format
 */
export const exportSocialMediaData = (
  data: any[],
  options: ExportOptions
): void => {
  const { format, filename = `social-media-export-${Date.now()}` } = options;

  if (format === 'json') {
    exportAsJSON(data, filename);
  } else if (format === 'csv') {
    exportAsCSV(data, filename);
  }
};

/**
 * Export data as JSON file
 */
const exportAsJSON = (data: any[], filename: string): void => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
};

/**
 * Export data as CSV file
 */
const exportAsCSV = (data: any[], filename: string): void => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get all unique keys from all objects
  const keys = Array.from(
    new Set(data.flatMap(obj => Object.keys(flattenObject(obj))))
  );

  // Create header row
  const header = keys.join(',');

  // Create data rows
  const rows = data.map(obj => {
    const flattened = flattenObject(obj);
    return keys.map(key => {
      const value = flattened[key];
      // Escape quotes and wrap in quotes if contains comma
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  const csvContent = [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

/**
 * Flatten nested objects for CSV export
 */
const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  const flattened: Record<string, any> = {};

  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      flattened[newKey] = '';
    } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      flattened[newKey] = JSON.stringify(value);
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
};

/**
 * Download blob as file
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export posts data
 */
export const exportPosts = (posts: SocialPost[], format: ExportFormat): void => {
  exportSocialMediaData(posts, {
    format,
    filename: `social-media-posts-${Date.now()}`,
  });
};

/**
 * Export accounts data
 */
export const exportAccounts = (accounts: SocialAccount[], format: ExportFormat): void => {
  exportSocialMediaData(accounts, {
    format,
    filename: `social-media-accounts-${Date.now()}`,
  });
};

/**
 * Export overview data
 */
export const exportOverview = (overview: PlatformOverview[], format: ExportFormat): void => {
  exportSocialMediaData(overview, {
    format,
    filename: `social-media-overview-${Date.now()}`,
  });
};

/**
 * Export scheduled posts data
 */
export const exportScheduledPosts = (posts: ScheduledPost[], format: ExportFormat): void => {
  exportSocialMediaData(posts, {
    format,
    filename: `social-media-scheduled-posts-${Date.now()}`,
  });
};

/**
 * Export anomalies data
 */
export const exportAnomalies = (anomalies: SocialAnomaly[], format: ExportFormat): void => {
  exportSocialMediaData(anomalies, {
    format,
    filename: `social-media-anomalies-${Date.now()}`,
  });
};

/**
 * Export all social media data in a single file
 */
export const exportAllData = (
  data: {
    accounts: SocialAccount[];
    posts: SocialPost[];
    overview: PlatformOverview[];
    scheduledPosts: ScheduledPost[];
    anomalies: SocialAnomaly[];
  },
  format: ExportFormat
): void => {
  if (format === 'json') {
    // Export as structured JSON with all data
    exportSocialMediaData([data], {
      format: 'json',
      filename: `social-media-complete-export-${Date.now()}`,
    });
  } else {
    // For CSV, export each type separately and zip them (simplified - just export posts)
    alert('For complete CSV export, please use individual export buttons for each data type.');
    exportPosts(data.posts, 'csv');
  }
};
