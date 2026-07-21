import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const orderStatus = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'custom_build',
  'orderplaced',
]);

export const listOrdersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: orderStatus.optional(),
  paymentStatus: z
    .enum(['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'])
    .optional(),
  search: z.string().trim().optional(),
});

export const idParam = z.object({ id: objectId });

export const updateStatusSchema = z.object({
  status: orderStatus,
  adminNotes: z.string().max(2000).optional(),
});

export const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product: objectId,
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, 'Order must contain at least one item'),
  shippingAddress: z.object({
    address: z.string().min(1),
    state: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1).default('India'),
    mobile: z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits'),
  }),
  paymentMethod: z.enum(['cod', 'razorpay']).default('cod'),
  notes: z.string().max(1000).optional(),
});

export const myOrdersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
