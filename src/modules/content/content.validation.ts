import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParam = z.object({ id: objectId });

/* Reviews */
export const createReviewSchema = z.object({
  image: z.string().url(),
  name: z.string().min(1).trim(),
  position: z.string().min(1).trim(),
  description: z.string().min(1).trim(),
});
export const updateReviewSchema = createReviewSchema.partial();

/* Certifications */
export const createCertificationSchema = z
  .object({
    title: z.string().min(1).max(200).trim(),
    description: z.string().min(1).trim(),
    issuedBy: z.string().min(1).trim(),
    issueDate: z.coerce.date(),
    expiryDate: z.coerce.date(),
    image: z.string().url(),
    verificationId: z.string().min(1).trim(),
  })
  .refine((d) => d.expiryDate > d.issueDate, {
    message: 'expiryDate must be after issueDate',
    path: ['expiryDate'],
  });

export const updateCertificationSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().min(1).trim().optional(),
  issuedBy: z.string().min(1).trim().optional(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  image: z.string().url().optional(),
  verificationId: z.string().min(1).trim().optional(),
  isActive: z.boolean().optional(),
});

export const certListQuery = z.object({
  activeOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
