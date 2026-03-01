import { z } from 'zod';

export const createRoadmapItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Project ID is required'),
  status: z.enum(['Planned', 'In Progress', 'Completed']).default('Planned'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  assignees: z.array(z.string()).optional(),
  order: z.number().optional(),
  labelIds: z.array(z.string()).optional(),
  quarter: z.string().optional(),
});

export const updateRoadmapItemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  projectId: z.string().min(1).optional(),
  status: z.enum(['Planned', 'In Progress', 'Completed']).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  assignees: z.array(z.string()).optional(),
  order: z.number().optional(),
  labelIds: z.array(z.string()).optional(),
  quarter: z.string().optional(),
});

export const listRoadmapItemsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  projectId: z.string().min(1, 'Project ID is required'),
  status: z.enum(['Planned', 'In Progress', 'Completed']).optional(),
  quarter: z.string().optional(),
  search: z.string().optional(),
});

export const reorderRoadmapItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1, 'Item ID is required'),
      order: z.number(),
    })
  ),
});

export type CreateRoadmapItemInput = z.infer<typeof createRoadmapItemSchema>;
export type UpdateRoadmapItemInput = z.infer<typeof updateRoadmapItemSchema>;
export type ListRoadmapItemsQuery = z.infer<typeof listRoadmapItemsQuerySchema>;
export type ReorderRoadmapItemsInput = z.infer<typeof reorderRoadmapItemsSchema>;
