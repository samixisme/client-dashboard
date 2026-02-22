import path from 'path';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  initializeDrive,
  listFiles,
  uploadFile,
  deleteFile,
  getFileMetadata,
  getFolderId,
} from '../utils/googleDrive';
import { getQuotaStats } from '../utils/driveQuota';
import { optionalApiKeyAuth } from './authMiddleware';

const router = Router();

// ─── CRITICAL: Authenticate all drive routes ─────────────────────────────────
router.use(optionalApiKeyAuth);

// Allowed MIME types for upload
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/json',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

// Regex for valid Google Drive file IDs (alphanumeric + dash + underscore, 10-50 chars)
const FILE_ID_RE = /^[\w-]{10,50}$/;

// Multer — store upload in memory buffer, max 200MB, allowlist MIME types
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// ─── GET /api/drive/files ────────────────────────────────────────────────────
// List files and subfolders at an optional ?folder= path
router.get('/files', async (req: Request, res: Response) => {
  try {
    await initializeDrive();
    const folderPath = (req.query.folder as string) || '';

    // Sanitize folder path: strip leading slashes and block traversal sequences
    const safeFolderPath = folderPath
      .replace(/\.\./g, '')
      .replace(/^\/+/, '')
      .trim();

    const items = await listFiles(safeFolderPath);

    const files = items.filter(
      (f: { mimeType: string }) => f.mimeType !== 'application/vnd.google-apps.folder'
    );
    const folders = items.filter(
      (f: { mimeType: string }) => f.mimeType === 'application/vnd.google-apps.folder'
    );

    return res.json({ files, folders, currentPath: safeFolderPath });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to list files' });
  }
});

// ─── GET /api/drive/files/:fileId/meta ───────────────────────────────────────
// Get metadata for a single file
router.get('/files/:fileId/meta', async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  if (!FILE_ID_RE.test(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }
  try {
    await initializeDrive();
    const meta = await getFileMetadata(fileId);
    return res.json(meta);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get file metadata' });
  }
});

// ─── POST /api/drive/upload ───────────────────────────────────────────────────
// Upload a file. Body: multipart/form-data with field "file" and optional "folder"
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    await initializeDrive();

    // CRITICAL: Sanitize folder and filename to prevent path traversal
    const rawFolder = (req.body.folder as string) || '';
    const safeFolder = rawFolder
      .replace(/\.\./g, '')
      .replace(/^\/+/, '')
      .replace(/[^a-zA-Z0-9 _\-/]/g, '')
      .trim();
    const safeName = path.basename(req.file.originalname);
    const filePath = safeFolder ? `${safeFolder}/${safeName}` : safeName;

    const fileId = await uploadFile(req.file.buffer, filePath);
    const meta = await getFileMetadata(fileId);

    return res.status(201).json({
      fileId,
      name: safeName,
      webViewLink: meta?.webViewLink || '',
    });
  } catch (error) {
    // Don't leak internal error details to client
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// ─── DELETE /api/drive/files/:fileId ────────────────────────────────────────
// Delete a file by ID
router.delete('/files/:fileId', async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  if (!FILE_ID_RE.test(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }
  try {
    await initializeDrive();
    await deleteFile(fileId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ─── GET /api/drive/folders ──────────────────────────────────────────────────
// Resolve a folder path to its Drive ID (useful for deep linking)
router.get('/folders', async (req: Request, res: Response) => {
  try {
    await initializeDrive();
    const rawPath = (req.query.path as string) || '';
    if (!rawPath) {
      return res.status(400).json({ error: 'path query param required' });
    }
    const safePath = rawPath.replace(/\.\./g, '').replace(/^\/+/, '').trim();
    const folderId = await getFolderId(safePath);
    return res.json({ folderId, path: safePath });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to resolve folder' });
  }
});

// ─── GET /api/drive/stats ────────────────────────────────────────────────────
// Return quota / storage usage stats
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = getQuotaStats();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
