import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParam = z.object({ id: objectId });

const mobile = z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits');
const postalCode = z.string().regex(/^\d{6}$/, 'Postal code must be 6 digits');

export const createAddressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  address: z.string().min(8).trim(),
  city: z.string().min(1).trim(),
  state: z.string().min(1).trim(),
  postalCode,
  country: z.string().trim().default('India'),
  mobile,
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();
