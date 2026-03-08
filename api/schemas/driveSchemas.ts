import { z } from 'zod';

// POST /api/drive/folders — body schema
export const createFolderBodySchema = z.object({
  path: z.string().min(1, 'Folder path is required').max(500, 'Folder path too long'),
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
