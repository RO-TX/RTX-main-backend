import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParam = z.object({ id: objectId });

const email = z.string().email().toLowerCase().trim();
const mobile = z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits');

/* Repair */
const attachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'video']),
  filename: z.string().max(200).optional(),
  size: z.number().int().nonnegative().optional(),
});

export const createRepairSchema = z.object({
  name: z.string().min(1).trim(),
  email,
  mobile,
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  district: z.string().min(1).trim(),
  city: z.string().min(1).trim(),
  address: z.string().min(1).trim(),
  description: z.string().min(1).trim(),
  // Customer's photos/videos of the fault (uploaded to storage; URLs passed here).
  attachments: z.array(attachmentSchema).max(8, 'Up to 8 files').optional(),
});

export const listRepairQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'completed']).optional(),
});

export const updateRepairSchema = z.object({
  status: z.enum(['pending', 'completed']).optional(),
  paymentStatus: z.enum(['unpaid', 'pending', 'paid', 'failed', 'refunded']).optional(),
});

/* AMC */
export const createAmcSchema = z.object({
  name: z.string().min(1).trim(),
  email,
  address: z.string().min(1).trim(),
  mobile,
  message: z.string().max(1000).optional(),
});

export const listAmcQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['new', 'contacted', 'closed']).optional(),
});

export const updateAmcSchema = z.object({
  status: z.enum(['new', 'contacted', 'closed']),
});
