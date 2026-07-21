import { z } from 'zod';

const email = z.string().email('Invalid email').toLowerCase().trim();
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');
const name = z.string().min(1).max(60).trim();
const mobile = z
  .string()
  .regex(/^\d{10}$/, 'Mobile must be 10 digits')
  .optional();

export const requestOtpSchema = z.object({
  email,
});

export const signupSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  mobile,
  password,
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  email,
  token: z.string().min(1, 'Token is required'),
  password,
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export const updateProfileSchema = z.object({
  firstName: name.optional(),
  lastName: name.optional(),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits').optional(),
  image: z.string().url('Image must be a valid URL').optional(),
});

export const deleteAccountSchema = z.object({
  password: z.string().default(''),
});

export const listLoginLogsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  success: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  email: z.string().trim().optional(),
});

export type SignupBody = z.infer<typeof signupSchema>;
