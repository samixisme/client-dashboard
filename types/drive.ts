// ─── Google Drive File Manager Types ─────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string; // Google returns size as string
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: 'application/vnd.google-apps.folder';
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveListResponse {
  files: DriveFile[];
  folders: DriveFolder[];
  currentPath: string;
}

export interface DriveUploadResponse {
  fileId: string;
  name: string;
  webViewLink: string;
}

export interface DriveStatsResponse {
  dailyUploadBytes: number;
  dailyUploadLimit: number;
  percentUsed: number;
  remainingBytes: number;
  requestsThisMinute: number;
  rateLimit: number;
  lastResetDate: string;
}

export type DriveViewMode = 'list' | 'grid';

export type DriveFileSortKey = 'name' | 'modifiedTime' | 'size';
export type DriveFileSortDir = 'asc' | 'desc';

// ─── MIME type helpers ────────────────────────────────────────────────────────

export const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/zip': 'ZIP',
  'application/json': 'JSON',
  'text/plain': 'TXT',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'image/svg+xml': 'SVG',
  'video/mp4': 'MP4',
  'video/webm': 'WEBM',
  'video/quicktime': 'MOV',
  'application/vnd.google-apps.folder': 'Folder',
  'application/vnd.google-apps.document': 'Google Doc',
  'application/vnd.google-apps.spreadsheet': 'Google Sheet',
  'application/vnd.google-apps.presentation': 'Google Slides',
};

export type DriveFileCategory = 'image' | 'video' | 'document' | 'spreadsheet' | 'archive' | 'other';

export function getFileCategory(mimeType: string): DriveFileCategory {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('presentationml') ||
    mimeType === 'text/plain' ||
    mimeType.includes('google-apps.document') ||
    mimeType.includes('google-apps.presentation')
  ) return 'document';
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('google-apps.spreadsheet')
  ) return 'spreadsheet';
  if (mimeType === 'application/zip' || mimeType === 'application/x-rar-compressed') return 'archive';
  return 'other';
}

export function formatFileSize(bytes: string | number | undefined): string {
  if (!bytes) return '—';
  const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(n) || n === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((n / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
