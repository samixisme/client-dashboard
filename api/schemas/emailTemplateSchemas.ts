import { z } from 'zod';

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['marketing', 'transactional', 'notification', 'newsletter', 'custom']),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  document: z.record(z.any()).optional(),
  projectId: z.string().optional(),
  brandId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isGlobal: z.boolean().default(false),
});

export const updateEmailTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['marketing', 'transactional', 'notification', 'newsletter', 'custom']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  document: z.record(z.any()).optional(),
  projectId: z.string().optional(),
  brandId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isGlobal: z.boolean().optional(),
});

export const listEmailTemplatesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  category: z.enum(['marketing', 'transactional', 'notification', 'newsletter', 'custom']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  search: z.string().optional(),
  projectId: z.string().optional(),
  brandId: z.string().optional(),
});

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
export type ListEmailTemplatesQuery = z.infer<typeof listEmailTemplatesQuerySchema>;
