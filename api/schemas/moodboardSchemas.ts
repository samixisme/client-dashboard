import { z } from 'zod';

export const createMoodboardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  projectId: z.string().min(1, 'Project ID is required'),
});

export const updateMoodboardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  projectId: z.string().min(1).optional(),
});

export const listMoodboardsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  projectId: z.string().optional(),
  search: z.string().optional(),
});

export type CreateMoodboardInput = z.infer<typeof createMoodboardSchema>;
export type UpdateMoodboardInput = z.infer<typeof updateMoodboardSchema>;
export type ListMoodboardsQuery = z.infer<typeof listMoodboardsQuerySchema>;
