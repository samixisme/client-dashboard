import { z } from 'zod';

export const createProposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  submitter: z.string().min(1),
  submitterId: z.string().min(1),
});

export const updateProposalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
});

export const listProposalsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  search: z.string().optional(),
});

export const transitionProposalStatusSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>;
export type TransitionProposalStatusInput = z.infer<typeof transitionProposalStatusSchema>;
