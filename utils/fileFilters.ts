// utils/fileFilters.ts — DES-112
// Pure filter computation logic. AND logic across all active criteria.
import { DriveFile, FileFilter, DriveFileType, DriveSizeRange, DriveDateRange } from '../types/drive';

// ─── Category → MIME matcher ──────────────────────────────────────────────────

function matchesFileType(file: DriveFile, types: DriveFileType[]): boolean {
  if (types.length === 0) return true;
  const mt = file.mimeType;
  return types.some(type => {
    switch (type) {
      case 'image':    return mt.startsWith('image/');
      case 'video':    return mt.startsWith('video/');
      case 'pdf':      return mt === 'application/pdf';
      case 'document': return (
        mt === 'application/msword' ||
        mt.includes('wordprocessingml') ||
        mt.includes('google-apps.document') ||
        mt.includes('presentationml') ||
        mt === 'text/plain'
      );
      case 'archive':  return (
        mt === 'application/zip' ||
        mt === 'application/x-rar-compressed' ||
        mt === 'application/x-tar' ||
        mt.includes('x-7z')
      );
      case 'code':     return (
        mt === 'application/json' ||
        mt.startsWith('text/') ||
        mt.includes('javascript') ||
        mt.includes('typescript') ||
        mt.includes('python') ||
        mt.includes('xml')
      );
      case 'other':    return true; // fallback – include if "other" explicitly selected
      default:         return false;
    }
  });
}

function matchesSizeRange(file: DriveFile, range: DriveSizeRange): boolean {
  const bytes = parseInt(file.size ?? '0', 10);
  const MB = 1_048_576;
  switch (range) {
    case '<1mb':     return bytes < MB;
    case '1-10mb':   return bytes >= MB && bytes < 10 * MB;
    case '10-100mb': return bytes >= 10 * MB && bytes < 100 * MB;
    case '>100mb':   return bytes >= 100 * MB;
    default:         return true;
  }
}

function matchesDateRange(file: DriveFile, range: DriveDateRange, customStart?: string, customEnd?: string): boolean {
  const t = file.modifiedTime ? new Date(file.modifiedTime).getTime() : 0;
  const now = Date.now();
  const DAY = 86_400_000;
  switch (range) {
    case 'today':  return (now - t) < DAY;
    case 'last7':  return (now - t) < 7 * DAY;
    case 'last30': return (now - t) < 30 * DAY;
    case 'last90': return (now - t) < 90 * DAY;
    case 'custom': {
      const start = customStart ? new Date(customStart).getTime() : 0;
      const end   = customEnd   ? new Date(customEnd).getTime() + DAY : Infinity;
      return t >= start && t <= end;
    }
    default: return true;
  }
}

// ─── Main computed filter ─────────────────────────────────────────────────────

export function applyFileFilters(files: DriveFile[], filters: FileFilter): DriveFile[] {
  if (Object.keys(filters).length === 0) return files;

  return files.filter(file => {
    // File type (OR within the type list, AND with other criteria)
    if (filters.fileType && filters.fileType.length > 0) {
      if (!matchesFileType(file, filters.fileType)) return false;
    }

    // Size range
    if (filters.sizeRange) {
      if (!matchesSizeRange(file, filters.sizeRange)) return false;
    }

    // Date range
    if (filters.dateRange) {
      if (!matchesDateRange(file, filters.dateRange, filters.customDateStart, filters.customDateEnd)) return false;
    }

    // Owner (OR within list)
    if (filters.owner && filters.owner.length > 0) {
      const fileOwners = (file.owners ?? []).map(o => o.emailAddress ?? o.displayName ?? '').filter(Boolean);
      const hasMatch = filters.owner.some(o => fileOwners.includes(o));
      if (!hasMatch) return false;
    }

    // Tags — placeholder (DES-122 will wire real tags)
    // if (filters.tags && filters.tags.length > 0) { ... }

    // Folder (match against file.parents or derived path)
    if (filters.folder && filters.folder.length > 0) {
      const fileParents = file.parents ?? [];
      const hasMatch = filters.folder.some(f => fileParents.includes(f));
      if (!hasMatch) return false;
    }

    return true;
  });
}
