import { z } from 'zod';

// ─── Shared sub-schemas ──────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Line item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  hasAsterisk: z.boolean().optional(),
  asteriskNote: z.string().optional(),
});

export const itemCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Category name is required'),
  items: z.array(lineItemSchema),
});

const statusEnum = z.enum(['Draft', 'Sent', 'Paid', 'Overdue']);

const totalsSchema = z.object({
  subtotal: z.number(),
  totalNet: z.number(),
});

// ─── Invoice schemas ─────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  userId: z.string().min(1, 'User ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().optional(),
  status: statusEnum.default('Draft'),
  itemCategories: z.array(itemCategorySchema),
  note: z.string().default(''),
  terms: z.string().default(''),
  totals: totalsSchema,
  brandId: z.string().optional(),
  assignedUserIds: z.array(z.string()).optional(),
});

export const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  userId: z.string().optional(),
  clientId: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  status: statusEnum.optional(),
  itemCategories: z.array(itemCategorySchema).optional(),
  note: z.string().optional(),
  terms: z.string().optional(),
  totals: totalsSchema.optional(),
  brandId: z.string().optional(),
  assignedUserIds: z.array(z.string()).optional(),
});

// ─── Estimate schemas ────────────────────────────────────────────────────────

export const createEstimateSchema = z.object({
  estimateNumber: z.string().min(1, 'Estimate number is required'),
  userId: z.string().min(1, 'User ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().optional(),
  status: statusEnum.default('Draft'),
  itemCategories: z.array(itemCategorySchema),
  note: z.string().default(''),
  terms: z.string().default(''),
  totals: totalsSchema,
  assignedUserIds: z.array(z.string()).optional(),
});

export const updateEstimateSchema = z.object({
  estimateNumber: z.string().min(1).optional(),
  userId: z.string().optional(),
  clientId: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  status: statusEnum.optional(),
  itemCategories: z.array(itemCategorySchema).optional(),
  note: z.string().optional(),
  terms: z.string().optional(),
  totals: totalsSchema.optional(),
  assignedUserIds: z.array(z.string()).optional(),
});

// ─── Query / bulk schemas ────────────────────────────────────────────────────

export const listPaymentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  clientId: z.string().optional(),
  status: statusEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required').max(500),
  status: statusEnum,
});

export const revenueQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ─── Inferred types ──────────────────────────────────────────────────────────

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type UpdateEstimateInput = z.infer<typeof updateEstimateSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type BulkStatusInput = z.infer<typeof bulkStatusSchema>;
export type RevenueQuery = z.infer<typeof revenueQuerySchema>;
