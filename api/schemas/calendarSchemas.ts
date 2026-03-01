import { z } from 'zod';

export const createCalendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  type: z.enum(['task', 'invoice', 'estimate', 'roadmap_item', 'manual', 'comment']),
  sourceId: z.string().nullable().optional(),
  userId: z.string().min(1, 'User ID is required'),
  brandId: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  reminder: z.string().optional(),
  meetLink: z.string().optional(),
  feedbackItemId: z.string().optional(),
  assignees: z.array(z.string()).optional(),
});

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  type: z.enum(['task', 'invoice', 'estimate', 'roadmap_item', 'manual', 'comment']).optional(),
  sourceId: z.string().nullable().optional(),
  userId: z.string().min(1).optional(),
  brandId: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  reminder: z.string().optional(),
  meetLink: z.string().optional(),
  feedbackItemId: z.string().optional(),
  assignees: z.array(z.string()).optional(),
});

export const listCalendarEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  type: z.enum(['task', 'invoice', 'estimate', 'roadmap_item', 'manual', 'comment']).optional(),
  startDateFrom: z.string().optional(),
  startDateTo: z.string().optional(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
export type ListCalendarEventsQuery = z.infer<typeof listCalendarEventsQuerySchema>;
