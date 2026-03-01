import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  projectId: z.string().min(1, 'projectId is required'),
  is_pinned: z.boolean().default(false),
  background_image: z.string().default(''),
  member_ids: z.array(z.string()).default([]),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  projectId: z.string().optional(),
  is_pinned: z.boolean().optional(),
  background_image: z.string().optional(),
  member_ids: z.array(z.string()).optional(),
});

export const listBoardsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  projectId: z.string().optional(),
});

export const createStageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  boardId: z.string().min(1, 'boardId is required'),
  order: z.number().int().min(0),
  status: z.enum(['Open', 'Closed']).default('Open'),
  backgroundPattern: z.string().optional(),
  sortConfig: z.object({
    key: z.enum(['createdAt', 'priority', 'title', 'dueDate']),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
});

export const updateStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  boardId: z.string().optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(['Open', 'Closed']).optional(),
  backgroundPattern: z.string().optional(),
  sortConfig: z.object({
    key: z.enum(['createdAt', 'priority', 'title', 'dueDate']),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
});

export const reorderStagesSchema = z.object({
  stages: z.array(z.object({
    id: z.string(),
    order: z.number().int().min(0),
  })).min(1),
});

export const bulkTaskMoveSchema = z.object({
  fromStageId: z.string(),
  toStageId: z.string(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type ListBoardsQuery = z.infer<typeof listBoardsQuerySchema>;
export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;
export type BulkTaskMoveInput = z.infer<typeof bulkTaskMoveSchema>;
