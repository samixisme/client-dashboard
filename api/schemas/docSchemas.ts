import { z } from 'zod';

export const createDocSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  brandId: z.string().min(1, 'Brand ID is required'),
  mode: z.enum(['page', 'edgeless']),
  emoji: z.string().optional(),
  linkedBoardId: z.string().optional(),
  isPinned: z.boolean().default(false),
});

export const updateDocSchema = z.object({
  title: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  mode: z.enum(['page', 'edgeless']).optional(),
  emoji: z.string().optional(),
  linkedBoardId: z.string().optional(),
  isPinned: z.boolean().optional(),
});

export const listDocsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  projectId: z.string().optional(),
  brandId: z.string().optional(),
  mode: z.enum(['page', 'edgeless']).optional(),
  search: z.string().optional(),
  isPinned: z.coerce.boolean().optional(),
});

export type CreateDocInput = z.infer<typeof createDocSchema>;
export type UpdateDocInput = z.infer<typeof updateDocSchema>;
export type ListDocsQuery = z.infer<typeof listDocsQuerySchema>;
