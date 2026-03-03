import { z } from 'zod';

// POST /api/drive/folders — body schema
export const createFolderBodySchema = z.object({
  path: z.string().min(1, 'Folder path is required').max(500, 'Folder path too long'),
});

export type CreateFolderBody = z.infer<typeof createFolderBodySchema>;
