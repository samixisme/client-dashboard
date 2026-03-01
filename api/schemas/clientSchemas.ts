import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  userId: z.string().min(1, 'userId (linked Firebase UID) is required'),
  brandId: z.string().optional(),
  adresse: z.string().min(1, 'Address is required'),
  adresse2: z.string().optional(),
  ice: z.string().min(1, 'ICE is required'),
  rc: z.string().min(1, 'RC is required'),
  if: z.string().min(1, 'IF is required'),
  paymenterUserId: z.number().int().positive().optional(),
});

export const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  userId: z.string().optional(),
  brandId: z.string().optional(),
  adresse: z.string().optional(),
  adresse2: z.string().optional(),
  ice: z.string().optional(),
  rc: z.string().optional(),
  if: z.string().optional(),
  paymenterUserId: z.number().int().positive().optional(),
});

export const listClientsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
