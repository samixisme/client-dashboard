import { z } from 'zod';

export const createSocialAccountSchema = z.object({
  platform: z.enum(['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube']),
  handle: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().optional().default(''),
  followers: z.number().optional().default(0),
  following: z.number().optional().default(0),
  posts: z.number().optional().default(0),
  isConnected: z.boolean().optional().default(true),
  lastSynced: z.string().optional(),
});

export const updateSocialAccountSchema = z.object({
  platform: z.enum(['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube']).optional(),
  handle: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  avatarUrl: z.string().optional(),
  followers: z.number().optional(),
  following: z.number().optional(),
  posts: z.number().optional(),
  isConnected: z.boolean().optional(),
  lastSynced: z.string().optional(),
});

export const listSocialAccountsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  platform: z.enum(['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube']).optional(),
  search: z.string().optional(),
});

export const createScheduledPostSchema = z.object({
  accountId: z.string().min(1),
  platform: z.enum(['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube']),
  content: z.string().min(1),
  mediaUrls: z.array(z.string()).optional(),
  scheduledFor: z.string().min(1),
  accountHandle: z.string().optional(),
});

export const updateScheduledPostSchema = z.object({
  content: z.string().min(1).optional(),
  mediaUrls: z.array(z.string()).optional(),
  scheduledFor: z.string().min(1).optional(),
});

export const listScheduledPostsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  accountId: z.string().optional(),
  platform: z.enum(['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube']).optional(),
  status: z.enum(['scheduled', 'published', 'failed', 'cancelled']).optional(),
});

export type CreateSocialAccountInput = z.infer<typeof createSocialAccountSchema>;
export type UpdateSocialAccountInput = z.infer<typeof updateSocialAccountSchema>;
export type ListSocialAccountsQuery = z.infer<typeof listSocialAccountsQuerySchema>;
export type CreateScheduledPostInput = z.infer<typeof createScheduledPostSchema>;
export type UpdateScheduledPostInput = z.infer<typeof updateScheduledPostSchema>;
export type ListScheduledPostsQuery = z.infer<typeof listScheduledPostsQuerySchema>;
