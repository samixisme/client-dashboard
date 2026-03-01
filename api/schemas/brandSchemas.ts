import { z } from 'zod';

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const brandLogoSchema = z.object({
  url: z.string().optional(),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  type: z.string().optional(),
  variation: z.string().optional(),
  formats: z.array(z.object({
    format: z.string(),
    url: z.string(),
  })).optional(),
});

const brandColorSchema = z.object({
  hex: z.string().regex(hexColorRegex, 'Invalid hex color (e.g. #FF00AA)'),
  name: z.string().min(1, 'Color name is required'),
  category: z.enum(['Primary', 'Secondary']).optional(),
  type: z.string().optional(),
  rgb: z.string().optional(),
  hsl: z.string().optional(),
  cmyk: z.string().optional(),
});

const brandTypographySchema = z.object({
  fontFamily: z.string().min(1),
  usage: z.string().min(1),
  fileUrl: z.string().min(1),
  category: z.enum(['Primary', 'Secondary']),
});

const brandFontStyleSchema = z.object({
  weight: z.string().optional(),
  style: z.string().optional(),
  url: z.string().optional(),
});

const brandFontSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  url: z.string().min(1),
  styles: z.array(brandFontStyleSchema),
});

const brandAssetSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
});

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  industry: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  logoUrl: z.string().url('Invalid logo URL').optional(),
  brandVoice: z.string().optional(),
  brandPositioning: z.string().optional(),
  logos: z.array(brandLogoSchema).optional(),
  colors: z.array(brandColorSchema).optional(),
  typography: z.array(brandTypographySchema).optional(),
  fonts: z.array(brandFontSchema).optional(),
  imagery: z.array(brandAssetSchema).optional(),
  graphics: z.array(brandAssetSchema).optional(),
});

export const updateBrandSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  industry: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  logoUrl: z.string().url('Invalid logo URL').optional(),
  brandVoice: z.string().optional(),
  brandPositioning: z.string().optional(),
  logos: z.array(brandLogoSchema).optional(),
  colors: z.array(brandColorSchema).optional(),
  typography: z.array(brandTypographySchema).optional(),
  fonts: z.array(brandFontSchema).optional(),
  imagery: z.array(brandAssetSchema).optional(),
  graphics: z.array(brandAssetSchema).optional(),
});

export const listBrandsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  startAfter: z.string().optional(),
  search: z.string().optional(),
  memberId: z.string().optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type ListBrandsQuery = z.infer<typeof listBrandsQuerySchema>;
