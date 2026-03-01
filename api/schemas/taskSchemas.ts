import { z } from 'zod';

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  type: z.string(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  boardId: z.string().min(1, 'boardId is required'),
  stageId: z.string().min(1, 'stageId is required'),
  description: z.string().default(''),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  assignees: z.array(z.string()).default([]),
  labelIds: z.array(z.string()).default([]),
  dueDate: z.string().optional(),
  start_date: z.string().optional(),
  cover_image: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
  order: z.number().optional(),
  timeEstimation: z.number().optional(),
  status: z.string().default('pending'),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  boardId: z.string().optional(),
  stageId: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  assignees: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  start_date: z.string().optional(),
  cover_image: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
  order: z.number().optional(),
  timeEstimation: z.number().optional(),
  status: z.string().optional(),
  roadmapItemId: z.string().optional(),
  recurring: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().int().positive(),
    nextDueDate: z.string(),
    repeatInStageId: z.string(),
    repeatOnlyWhenCompleted: z.boolean(),
  }).optional(),
  sourceType: z.string().optional(),
  sourceFeedbackItemId: z.string().optional(),
});

export const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  boardId: z.string().optional(),
  stageId: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.string().optional(),
  assignee: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'priority', 'dueDate', 'title']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  expandTimeLogs: z.coerce.boolean().optional(),
});

export const bulkStatusSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1).max(500),
  status: z.string().min(1),
});

export const bulkPrioritySchema = z.object({
  taskIds: z.array(z.string()).min(1).max(500),
  priority: z.enum(['Low', 'Medium', 'High']),
});

export const bulkReassignSchema = z.object({
  taskIds: z.array(z.string()).min(1).max(500),
  assignees: z.array(z.string()),
});

export const bulkDeleteSchema = z.object({
  taskIds: z.array(z.string()).min(1).max(500),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type BulkStatusInput = z.infer<typeof bulkStatusSchema>;
export type BulkPriorityInput = z.infer<typeof bulkPrioritySchema>;
export type BulkReassignInput = z.infer<typeof bulkReassignSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
