import { z } from 'zod';

const anyRole = z.enum(['customer', 'call_center', 'microadmin', 'admin']);
// Roles an admin can assign when creating a staff account (not `customer`).
const staffRole = z.enum(['call_center', 'microadmin', 'admin']);

export const listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: anyRole.optional(),
  search: z.string().trim().optional(),
});

export const userIdParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id'),
});

export const updateRoleSchema = z.object({
  role: anyRole,
});

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(60).trim(),
  lastName: z.string().min(1).max(60).trim(),
  email: z.string().email().toLowerCase().trim(),
  mobile: z
    .string()
    .regex(/^\d{10}$/, 'Mobile must be 10 digits')
    .optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: staffRole,
});
