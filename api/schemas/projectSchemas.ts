import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  brandId: z.string().min(1, 'brandId is required'),
  description: z.string().default(''),
  status: z.enum(['Active', 'Archived', 'Completed']).default('Active'),
  memberIds: z.array(z.string()).default([]),
  logoUrl: z.string().url().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  brandId: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['Active', 'Archived', 'Completed']).optional(),
  memberIds: z.array(z.string()).optional(),
  logoUrl: z.string().url().optional(),
});

export const listProjectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  search: z.string().optional(),
  brandId: z.string().optional(),
  status: z.enum(['Active', 'Archived', 'Completed']).optional(),
  memberId: z.string().optional(),
});

export const duplicateProjectSchema = z.object({
  newName: z.string().min(1).max(200).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type DuplicateProjectInput = z.infer<typeof duplicateProjectSchema>;
