import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().optional(),
  role: z.enum(['admin', 'client']).default('client'),
  status: z.enum(['pending', 'approved', 'disabled']).default('pending'),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().optional(),
  photoURL: z.string().url().optional(),
  role: z.enum(['admin', 'client']).optional(),
  status: z.enum(['pending', 'approved', 'disabled']).optional(),
  disabled: z.boolean().optional(),
});

export const bulkUserIdsSchema = z.object({
  uids: z.array(z.string().min(1)).min(1, 'At least one UID required').max(500),
});

export const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  role: z.enum(['admin', 'client']).optional(),
  status: z.enum(['pending', 'approved', 'disabled']).optional(),
  search: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type BulkUserIdsInput = z.infer<typeof bulkUserIdsSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
