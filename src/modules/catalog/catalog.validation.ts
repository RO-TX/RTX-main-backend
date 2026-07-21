import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const productTypeEnum = z.enum(['homeproduct', 'customproduct', 'customplushome']);
const categoryTypeEnum = z.enum(['customplushome', 'customcategory', 'homecategory']);

/* ── Products ── */

export const listProductsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
  productType: productTypeEnum.optional(),
  isTopSeller: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['sequence', 'price_asc', 'price_desc', 'newest']).default('sequence'),
});

export const createProductSchema = z.object({
  skuid: z.string().min(1).trim(),
  slug: z
    .string()
    .min(1)
    .trim()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  name: z.string().min(1).trim(),
  images: z.array(z.string().url()).min(1, 'At least one image is required'),
  description: z.string().default(''),
  flipkartLink: z.string().url().or(z.literal('')).default(''),
  amazonLink: z.string().url().or(z.literal('')).default(''),
  mrp: z.number().min(0).default(0),
  price: z.number().min(0),
  gstRate: z.number().min(0).max(100).default(18),
  installationCharge: z.number().min(0).default(0),
  quantity: z.number().int().min(0).default(0),
  category: objectId,
  isTopSeller: z.boolean().default(false),
  productType: productTypeEnum.default('homeproduct'),
  shipment_width: z.string().default(''),
  shipment_height: z.string().default(''),
  shipment_length: z.string().default(''),
  weight: z.string().default(''),
  fragile: z.boolean().default(false),
  warrantyMonths: z.number().int().min(0).default(12),
  hsnCode: z.string().default(''),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().min(0).default(0),
  sequence: z.number().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const slugParam = z.object({ slug: z.string().min(1).trim() });
export const idParam = z.object({ id: objectId });

/* ── Categories ── */

export const listCategoriesQuery = z.object({
  withProducts: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).trim(),
  catImage: z.string().url(),
  description: z.string().default(''),
  categoryType: categoryTypeEnum.default('homecategory'),
});

export const updateCategorySchema = createCategorySchema.partial();

export const deleteCategoryQuery = z.object({
  force: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
