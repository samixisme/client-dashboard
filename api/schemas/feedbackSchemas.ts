import { z } from 'zod';

const feedbackTypeEnum = z.enum(['mockup', 'website', 'video']);
const feedbackStatusEnum = z.enum(['pending', 'in_review', 'approved', 'changes_requested']);

const pageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  approved: z.boolean().optional(),
});

const imageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  approved: z.boolean().optional(),
});

const videoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  approved: z.boolean().optional(),
});

export const createFeedbackSchema = z.object({
  name: z.string().min(1, 'Name is required').max(300),
  projectId: z.string().min(1, 'projectId is required'),
  type: feedbackTypeEnum,
  description: z.string().default(''),
  assetUrl: z.string().min(1, 'assetUrl is required'),
  status: feedbackStatusEnum.default('pending'),
  createdBy: z.string().min(1, 'createdBy is required'),
  pages: z.array(pageSchema).optional(),
  images: z.array(imageSchema).optional(),
  videos: z.array(videoSchema).optional(),
});

export const updateFeedbackSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  projectId: z.string().min(1).optional(),
  type: feedbackTypeEnum.optional(),
  description: z.string().optional(),
  assetUrl: z.string().min(1).optional(),
  status: feedbackStatusEnum.optional(),
  createdBy: z.string().min(1).optional(),
  pages: z.array(pageSchema).optional(),
  images: z.array(imageSchema).optional(),
  videos: z.array(videoSchema).optional(),
});

export const listFeedbackQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  projectId: z.string().optional(),
  type: feedbackTypeEnum.optional(),
  status: feedbackStatusEnum.optional(),
  search: z.string().optional(),
});

export const bulkStatusSchema = z.object({
  feedbackIds: z.array(z.string().min(1)).min(1, 'At least one feedback ID required').max(500),
  status: feedbackStatusEnum,
});

export const addVersionSchema = z.object({
  assetUrl: z.string().min(1, 'assetUrl is required'),
  notes: z.string().optional(),
  createdBy: z.string().min(1, 'createdBy is required'),
});

export const updateStatusSchema = z.object({
  status: feedbackStatusEnum,
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
export type BulkStatusInput = z.infer<typeof bulkStatusSchema>;
export type AddVersionInput = z.infer<typeof addVersionSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
