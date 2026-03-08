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
  getFileRevisions,
  revertFileRevision,
  renameFile,
  moveFile,
} from '../utils/googleDrive';
import { getQuotaStats } from '../utils/driveQuota';
import { optionalApiKeyAuth } from './authMiddleware';
import {
  createFolderBodySchema,
  renameFileBodySchema,
  moveFileBodySchema,
  bulkDeleteBodySchema,
  bulkMoveBodySchema,
} from './schemas/driveSchemas';

const router = Router();

// ─── Authentication for drive routes is currently relaxed for the frontend ───
// router.use(optionalApiKeyAuth);

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

// Multer — store upload in memory buffer, max 200MB.
// We removed strict MIME checking here because many browser uploads default to
// application/octet-stream which caused false positives and silent failures.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB Max
});

// ─── GET /api/drive/health ───────────────────────────────────────────────────
// Test Google Drive credential loading and API reachability
router.get('/health', async (_req: Request, res: Response) => {
  try {
    await initializeDrive();

    const credentialSource = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
      ? 'env-json'
      : process.env.GOOGLE_SERVICE_ACCOUNT_PATH
        ? 'file-path'
        : 'none';

    return res.status(200).json({
      status: 'ok',
      message: 'Google Drive API is reachable',
      rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'auto-detected',
      credentialSource,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Drive initialization failed';
    return res.status(503).json({ status: 'error', message });
  }
});

// NOTE: webViewLinks returned after upload may 403 briefly (5-30s) due to
// Google Drive permission propagation delays. This is expected behavior.

// ─── GET /api/drive/files ────────────────────────────────────────────────────
// List files and subfolders at an optional ?folder= path
router.get('/files', async (req: Request, res: Response) => {
  try {
    await initializeDrive();
    
    let safeFolderPath = '';

    if (req.query.projectId) {
      const rawProjectId = String(req.query.projectId);
      const safeProjectId = rawProjectId
        .replace(/\.\./g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .trim();
      
      safeFolderPath = `projects/${safeProjectId}`;
      
      try {
        await getFolderId(safeFolderPath);
      } catch {
        // Folder resolution failed — listFiles will return empty results
      }
    } else {
      const folderPath = (req.query.folder as string) || '';
      // Sanitize folder path: strip leading slashes and block traversal sequences
      safeFolderPath = folderPath
        .replace(/\.\./g, '')
        .replace(/^\/+/, '')
        .trim();
    }

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

// ─── GET /api/drive/files/:fileId/revisions ─────────────────────────────────
// Get version history for a file
router.get('/files/:fileId/revisions', async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  if (!FILE_ID_RE.test(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }
  try {
    const revisions = await getFileRevisions(fileId);
    return res.json({ revisions });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get file revisions' });
  }
});

// ─── POST /api/drive/files/:fileId/revisions/:revisionId/revert ─────────────
// Revert a file to a specific revision
router.post('/files/:fileId/revisions/:revisionId/revert', async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  const revisionId = String(req.params.revisionId);
  
  if (!FILE_ID_RE.test(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }
  if (!revisionId) {
    return res.status(400).json({ error: 'Invalid revision ID' });
  }
  
  try {
    await revertFileRevision(fileId, revisionId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to revert file revision' });
  }
});

// ─── PATCH /api/drive/files/:fileId/rename ──────────────────────────────────
// Rename a file or folder
router.patch('/files/:fileId/rename', async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  if (!FILE_ID_RE.test(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  const validation = renameFileBodySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors[0].message });
  }

  try {
    await renameFile(fileId, validation.data.name);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to rename file' });
  }
});

// ─── POST /api/drive/files/:fileId/move ─────────────────────────────────────
// Move a file or folder to a new location
router.post('/files/:fileId/move', async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  if (!FILE_ID_RE.test(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  const validation = moveFileBodySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors[0].message });
  }

  try {
    await moveFile(fileId, validation.data.folderId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to move file' });
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

// ─── POST /api/drive/folders ─────────────────────────────────────────────────
// Create a folder at the given path (nested creation supported)
router.post('/folders', async (req: Request, res: Response) => {
  try {
    const validation = createFolderBodySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    await initializeDrive();

    const safePath = validation.data.path
      .replace(/\.\./g, '')
      .replace(/^\/+/, '')
      .trim();

    if (!safePath) {
      return res.status(400).json({ error: 'Invalid folder path' });
    }

    // getFolderId already handles nested creation internally
    const folderId = await getFolderId(safePath);
    return res.status(201).json({ folderId, path: safePath });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create folder' });
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

// ─── GET /api/drive/files/recent ────────────────────────────────────────────
// Return the last 10 files sorted by modifiedTime descending
router.get('/files/recent', async (_req: Request, res: Response) => {
  try {
    await initializeDrive();
    const items = await listFiles('');
    const files = items
      .filter((f: { mimeType: string }) => f.mimeType !== 'application/vnd.google-apps.folder')
      .sort((a: { modifiedTime?: string }, b: { modifiedTime?: string }) => {
        const ta = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
        const tb = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10);
    return res.json({ success: true, data: { files } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch recent files' });
  }
});

// ─── POST /api/drive/files/bulk/delete ──────────────────────────────────────
// Delete multiple files. Body: { fileIds: string[] }
router.post('/files/bulk/delete', async (req: Request, res: Response) => {
  const validation = bulkDeleteBodySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, error: validation.error.errors[0].message });
  }
  const { fileIds } = validation.data;
  try {
    await initializeDrive();
    const results = await Promise.allSettled(fileIds.map((id) => deleteFile(id)));
    const deleted = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return res.json({ success: true, data: { deleted, failed, total: fileIds.length } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Bulk delete failed' });
  }
});

// ─── POST /api/drive/files/bulk/move ────────────────────────────────────────
// Move multiple files to a folder. Body: { fileIds: string[], folderId: string }
router.post('/files/bulk/move', async (req: Request, res: Response) => {
  const validation = bulkMoveBodySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, error: validation.error.errors[0].message });
  }
  const { fileIds, folderId } = validation.data;
  try {
    await initializeDrive();
    const results = await Promise.allSettled(fileIds.map((id) => moveFile(id, folderId)));
    const moved = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return res.json({ success: true, data: { moved, failed, total: fileIds.length } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Bulk move failed' });
  }
});

// ─── GET /api/drive/files/:fileId/share ─────────────────────────────────────
// Generate a shareable download link for a file (no Drive API call needed)
router.get('/files/:fileId/share', (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  if (!FILE_ID_RE.test(fileId)) {
    return res.status(400).json({ success: false, error: 'Invalid file ID' });
  }
  const shareUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  return res.json({ success: true, data: { shareUrl, fileId } });
});

export default router;
