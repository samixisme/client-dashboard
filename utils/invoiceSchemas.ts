import { z } from 'zod';

// ── Invoice schemas ────────────────────────────────────────────────────────────

export const invoiceStatusSchema = z.enum(['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const estimateStatusSchema = z.enum(['Draft', 'Sent', 'Accepted', 'Declined', 'Cancelled']);
export type EstimateStatus = z.infer<typeof estimateStatusSchema>;

export const lineItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export const itemCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  items: z.array(lineItemSchema),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  clientId: z.string().min(1),
  userId: z.string().min(1),
  date: z.string(),
  dueDate: z.string().optional(),
  status: invoiceStatusSchema,
  itemCategories: z.array(itemCategorySchema),
  note: z.string().optional(),
  terms: z.string().optional(),
  totals: z.object({
    subtotal: z.number().nonnegative(),
    totalNet: z.number().nonnegative(),
  }),
});

export const estimateSchema = invoiceSchema.omit({ invoiceNumber: true }).extend({
  estimateNumber: z.string().min(1),
  status: estimateStatusSchema,
  convertedInvoiceId: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type EstimateFormData = z.infer<typeof estimateSchema>;
