import { User, type UserRole } from '../../models';
import { ApiError } from '../../lib/ApiError';
import { hashPassword } from '../../lib/password';

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  password: string;
  role: 'call_center' | 'microadmin' | 'admin';
}

/** Admin-only: create a staff account (call_center / microadmin / admin). */
export async function createStaffUser(input: CreateStaffInput) {
  const existing = await User.findOne({ email: input.email }).lean();
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    mobile: input.mobile ?? '',
    password: await hashPassword(input.password),
    role: input.role,
    emailVerified: true, // staff accounts are trusted/pre-verified
  });
  return user;
}

export interface ListUsersParams {
  page: number;
  limit: number;
  role?: UserRole;
  search?: string;
}

export async function listUsers(params: ListUsersParams) {
  const { page, limit, role, search } = params;
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUser(id: string) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function updateRole(id: string, role: UserRole, actingUserId: string) {
  if (id === actingUserId) {
    throw ApiError.badRequest('You cannot change your own role');
  }
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  user.role = role;
  await user.save();
  return user;
}

export async function deleteUser(id: string, actingUserId: string) {
  if (id === actingUserId) {
    throw ApiError.badRequest('You cannot delete your own account here');
  }
  const user = await User.findByIdAndDelete(id);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}
