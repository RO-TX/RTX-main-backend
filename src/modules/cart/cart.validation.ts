import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const productIdParam = z.object({ productId: objectId });

export const addItemSchema = z.object({
  productId: objectId,
  quantity: z.number().int().min(1).default(1),
});

export const setQtySchema = z.object({
  quantity: z.number().int().min(0),
});
