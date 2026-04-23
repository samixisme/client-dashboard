import path from 'path';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  initializeDrive,
  listFiles,
  listFilesByFolderId,
  uploadFile,
  deleteFile,
  getFileMetadata,
  getFolderId,
  getFileRevisions,
  revertFileRevision,
  renameFile,
  moveFile,
  updateFileAppProperties,
} from '../utils/googleDrive';
import { getQuotaStats } from '../utils/driveQuota';
import { optionalApiKeyAuth } from './authMiddleware';
import {
  createFolderBodySchema,
  renameFileBodySchema,
  moveFileBodySchema,
  bulkDeleteBodySchema,
  bulkMoveBodySchema,
  createTagBodySchema,
  assignTagBodySchema,
  logActivityBodySchema,
} from './schemas/driveSchemas';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';

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
// List files and subfolders at an optional ?folder= path or ?folderId=
router.get('/files', async (req: Request, res: Response) => {
  try {
    await initializeDrive();
    
    let safeFolderPath = '';
    let items;

    if (req.query.folderId) {
      const folderId = String(req.query.folderId).trim();
      items = await listFilesByFolderId(folderId);
      safeFolderPath = folderId;
    } else if (req.query.projectId) {
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
      items = await listFiles(safeFolderPath);
    } else {
      const folderPath = (req.query.folder as string) || '';
      // Sanitize folder path: strip leading slashes and block traversal sequences
      safeFolderPath = folderPath
        .replace(/\.\./g, '')
        .replace(/^\/+/, '')
        .trim();
      items = await listFiles(safeFolderPath);
    }

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

    // [DES-46 & DES-48] Sync drive file metadata to search and firestore
    try {
      const { default: admin } = await import('firebase-admin');
      if (!admin.apps.length) admin.initializeApp();
      const db = admin.firestore();
      
      const fileDocument = {
        name: safeName,
        mimeType: req.file.mimetype || 'application/octet-stream',
        webViewLink: meta?.webViewLink || '',
        folderPath: safeFolder,
        size: req.file.size || 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      // 1. Save to Firestore for batch job tracking
      await db.collection('drive_files').doc(fileId).set(fileDocument, { merge: true });

      // 2. Push immediately to Meilisearch
      const { upsertDocument } = await import('./searchSync');
      await upsertDocument('drive_files', { id: fileId, ...fileDocument, modifiedTime: new Date().toISOString() });
    } catch (syncErr: any) {
      console.warn('[driveRoutes] Could not sync uploaded file to search:', syncErr.message);
    }

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

    // [DES-26 & DES-48] Mark as deleted in Firestore and remove from Meilisearch
    try {
      const { default: admin } = await import('firebase-admin');
      if (!admin.apps.length) admin.initializeApp();
      const db = admin.firestore();
      
      await db.collection('drive_files').doc(fileId).set({
        isDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const { deleteDocument } = await import('./searchSync');
      await deleteDocument('drive_files', fileId);
    } catch (syncErr: any) {
      console.warn('[driveRoutes] Could not sync deleted file to search:', syncErr.message);
    }

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

    if (validation.data.parentFolderId && validation.data.name) {
      const { google } = await import('googleapis');
      const drive = google.drive('v3');
      
      const folderMetadata = {
        name: validation.data.name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [validation.data.parentFolderId],
      };
      
      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, name',
        supportsAllDrives: true,
      });
      
      return res.status(201).json({ success: true, data: { folder: folder.data } });
    }

    const safePath = validation.data.path!
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

// ═════════════════════════════════════════════════════════════════════════════
// ─── TAG MANAGEMENT (DES-122) ───────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/drive/tags — Create a new tag
router.post('/tags', async (req: Request, res: Response) => {
  const validation = createTagBodySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, error: validation.error.errors[0].message });
  }
  try {
    const db = getFirestore();
    const { name, color, projectId } = validation.data;

    // Idempotent: check for duplicate tag name in the same project
    const existingSnap = await db.collection('fileTags')
      .where('name', '==', name)
      .where('projectId', '==', projectId || 'default')
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0];
      return res.json({ success: true, data: { id: existing.id, ...existing.data() } });
    }

    const tagData = {
      name,
      color: color || 'red',
      projectId: projectId || 'default',
      createdBy: 'local',
      createdAt: new Date().toISOString(),
      fileCount: 0,
    };
    const docRef = await db.collection('fileTags').add(tagData);
    logger.info({ tagId: docRef.id, name }, 'Tag created');
    return res.status(201).json({ success: true, data: { id: docRef.id, ...tagData } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create tag');
    return res.status(500).json({ success: false, error: 'Failed to create tag' });
  }
});

// GET /api/drive/tags — List tags for a project
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const projectId = String(req.query.projectId || 'default');
    const snap = await db.collection('fileTags')
      .where('projectId', '==', projectId)
      .orderBy('name')
      .get();
    const tags = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json({ success: true, data: { tags } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list tags');
    return res.status(500).json({ success: false, error: 'Failed to list tags' });
  }
});

// DELETE /api/drive/tags/:tagId — Delete a tag and cascade remove assignments
router.delete('/tags/:tagId', async (req: Request, res: Response) => {
  const tagId = String(req.params.tagId);
  if (!tagId) {
    return res.status(400).json({ success: false, error: 'Tag ID is required' });
  }
  try {
    const db = getFirestore();
    // Delete all assignments for this tag
    const assignmentsSnap = await db.collection('fileTagMappings')
      .where('tagId', '==', tagId)
      .get();
    const batch = db.batch();
    assignmentsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(db.collection('fileTags').doc(tagId));
    await batch.commit();
    logger.info({ tagId }, 'Tag deleted with cascade');
    return res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete tag');
    return res.status(500).json({ success: false, error: 'Failed to delete tag' });
  }
});

// POST /api/drive/files/:fileId/tags — Assign a tag to a file
router.post('/files/:fileId/tags', async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  const validation = assignTagBodySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, error: validation.error.errors[0].message });
  }
  try {
    const db = getFirestore();
    const { tagId } = validation.data;

    // Check if already assigned
    const existingSnap = await db.collection('fileTagMappings')
      .where('fileId', '==', fileId)
      .where('tagId', '==', tagId)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      return res.json({ success: true, data: { message: 'Tag already assigned' } });
    }

    const assignmentData = {
      fileId,
      tagId,
      assignedAt: new Date().toISOString(),
      assignedBy: 'local',
    };
    const docRef = await db.collection('fileTagMappings').add(assignmentData);

    // Increment fileCount on the tag
    await db.collection('fileTags').doc(tagId).update({
      fileCount: (await db.collection('fileTagMappings').where('tagId', '==', tagId).get()).size,
    });

    // [DES-122] Sync to Drive appProperties
    try {
      const fileMeta = await getFileMetadata(fileId);
      const existingAppProps = fileMeta.appProperties || {};
      const currentTagsStr = existingAppProps.tags || '';
      const tagsArray = currentTagsStr ? currentTagsStr.split(',') : [];
      if (!tagsArray.includes(tagId)) {
        tagsArray.push(tagId);
        await updateFileAppProperties(fileId, { tags: tagsArray.join(',') });
      }
    } catch (e) {
      console.warn('Failed to sync tag to Drive appProperties', e);
    }

    return res.status(201).json({ success: true, data: { id: docRef.id, ...assignmentData } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to assign tag');
    return res.status(500).json({ success: false, error: 'Failed to assign tag' });
  }
});

// DELETE /api/drive/files/:fileId/tags/:tagId — Remove a tag from a file
router.delete('/files/:fileId/tags/:tagId', async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  const tagId = String(req.params.tagId);
  try {
    const db = getFirestore();
    const snap = await db.collection('fileTagMappings')
      .where('fileId', '==', fileId)
      .where('tagId', '==', tagId)
      .get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // Update fileCount on the tag
    try {
      await db.collection('fileTags').doc(tagId).update({
        fileCount: (await db.collection('fileTagMappings').where('tagId', '==', tagId).get()).size,
      });
    } catch { /* tag may have been deleted */ }

    // [DES-122] Sync down to Drive appProperties
    try {
      const fileMeta = await getFileMetadata(fileId);
      const existingAppProps = fileMeta.appProperties || {};
      const currentTagsStr = existingAppProps.tags || '';
      let tagsArray = currentTagsStr ? currentTagsStr.split(',') : [];
      if (tagsArray.includes(tagId)) {
        tagsArray = tagsArray.filter((id: string) => id !== tagId);
        await updateFileAppProperties(fileId, { tags: tagsArray.join(',') || null }); // delete property if empty
      }
    } catch (e) {
      console.warn('Failed to sync tag remove to Drive appProperties', e);
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to remove tag');
    return res.status(500).json({ success: false, error: 'Failed to remove tag' });
  }
});

// GET /api/drive/files/:fileId/tags — Get tags for a specific file
router.get('/files/:fileId/tags', async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId);
  try {
    const db = getFirestore();
    const mappingsSnap = await db.collection('fileTagMappings')
      .where('fileId', '==', fileId)
      .get();
    const tagIds = mappingsSnap.docs.map((doc) => doc.data().tagId as string);
    if (tagIds.length === 0) {
      return res.json({ success: true, data: { tags: [] } });
    }
    // Fetch tag details
    const refs = tagIds.map((id: string) => db.collection('fileTags').doc(id));
    const tagsSnap = await db.getAll(...refs);
    const tags = tagsSnap
      .filter((doc) => doc.exists)
      .map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json({ success: true, data: { tags } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get file tags');
    return res.status(500).json({ success: false, error: 'Failed to get file tags' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ─── ACTIVITY LOG (DES-93) ──────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/drive/activity — Log an activity event
router.post('/activity', async (req: Request, res: Response) => {
  const validation = logActivityBodySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, error: validation.error.errors[0].message });
  }
  try {
    const db = getFirestore();
    const activityData = {
      ...validation.data,
      projectId: validation.data.projectId || 'default',
      timestamp: new Date().toISOString(),
    };
    const docRef = await db.collection('fileActivity').add(activityData);
    return res.status(201).json({ success: true, data: { id: docRef.id } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to log activity');
    return res.status(500).json({ success: false, error: 'Failed to log activity' });
  }
});

// GET /api/drive/activity — Get recent activity
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const projectId = String(req.query.projectId || 'default');
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 100);
    const snap = await db.collection('fileActivity')
      .where('projectId', '==', projectId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    const activities = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json({ success: true, data: { activities } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch activity log');
    return res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ─── STORAGE QUOTA (DES-117) ────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/drive/storage — Get Google Drive storage quota
router.get('/storage', async (_req: Request, res: Response) => {
  try {
    await initializeDrive();
    // Use the google drive about API to get storage quota
    const { google } = await import('googleapis');
    const drive = google.drive('v3');
    const about = await drive.about.get({ fields: 'storageQuota,user' });
    const quota = about.data.storageQuota;
    if (!quota) {
      return res.json({
        success: true,
        data: {
          used: 0,
          total: 0,
          usedInDrive: 0,
          usedInTrash: 0,
          percentUsed: 0,
        },
      });
    }
    const used = parseInt(quota.usage || '0', 10);
    const total = parseInt(quota.limit || '0', 10);
    return res.json({
      success: true,
      data: {
        used,
        total,
        usedInDrive: parseInt(quota.usageInDrive || '0', 10),
        usedInTrash: parseInt(quota.usageInDriveTrash || '0', 10),
        percentUsed: total > 0 ? Math.round((used / total) * 100) : 0,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch storage quota');
    return res.status(500).json({ success: false, error: 'Failed to fetch storage quota' });
  }
});

export default router;
