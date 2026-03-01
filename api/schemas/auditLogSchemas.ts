import { z } from 'zod';

export const listAuditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  adminUserId: z.string().optional(),
  entityType: z.string().optional(),
  actionType: z.enum(['create', 'update', 'delete']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;
