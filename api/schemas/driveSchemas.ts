import { z } from 'zod';

// POST /api/drive/folders — body schema
export const createFolderBodySchema = z.object({
  path: z.string().max(500, 'Folder path too long').optional(),
  parentFolderId: z.string().optional(),
  name: z.string().max(200, 'Folder name too long').optional(),
}).refine(data => data.path || (data.parentFolderId && data.name), {
  message: 'Must provide either path OR both parentFolderId and name',
});

export type CreateFolderBody = z.infer<typeof createFolderBodySchema>;

// PATCH /api/drive/files/:fileId/rename
export const renameFileBodySchema = z.object({
  name: z.string().min(1, 'New name is required').max(200, 'Name too long'),
});
export type RenameFileBody = z.infer<typeof renameFileBodySchema>;

// POST /api/drive/files/:fileId/move
export const moveFileBodySchema = z.object({
  folderId: z.string().min(1, 'Target folder ID is required'),
});
export type MoveFileBody = z.infer<typeof moveFileBodySchema>;

// POST /api/drive/files/bulk/delete
const fileIdItem = z.string().min(10).max(50).regex(/^[\w-]+$/);
export const bulkDeleteBodySchema = z.object({
  fileIds: z.array(fileIdItem).min(1, 'At least one file ID required').max(100, 'Max 100 files per request'),
});
export type BulkDeleteBody = z.infer<typeof bulkDeleteBodySchema>;

// POST /api/drive/files/bulk/move
export const bulkMoveBodySchema = z.object({
  fileIds: z.array(fileIdItem).min(1, 'At least one file ID required').max(100, 'Max 100 files per request'),
  folderId: z.string().min(1, 'Target folder ID is required'),
});
export type BulkMoveBody = z.infer<typeof bulkMoveBodySchema>;

// ─── Tag management ───────────────────────────────────────────────────────────

// POST /api/drive/tags — create a tag
export const createTagBodySchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long')
    .regex(/^[\w\s-]+$/, 'Tag name may only contain letters, numbers, spaces, hyphens'),
  color: z.string().max(20).optional(),
  projectId: z.string().min(1, 'Project ID is required').optional(),
});
export type CreateTagBody = z.infer<typeof createTagBodySchema>;

// POST /api/drive/files/:fileId/tags — assign tag to file
export const assignTagBodySchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required'),
});
export type AssignTagBody = z.infer<typeof assignTagBodySchema>;

// ─── Activity logging ─────────────────────────────────────────────────────────

const activityAction = z.enum(['upload', 'delete', 'rename', 'share', 'move', 'tag', 'comment']);

// POST /api/drive/activity — log an activity event
export const logActivityBodySchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
  fileName: z.string().min(1, 'File name is required'),
  action: activityAction,
  userId: z.string().min(1, 'User ID is required'),
  userName: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  projectId: z.string().optional(),
});
export type LogActivityBody = z.infer<typeof logActivityBodySchema>;
