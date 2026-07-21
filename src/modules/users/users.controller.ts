import type { Request, Response } from 'express';
import * as usersService from './users.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok, created, paginated } from '../../lib/apiResponse';
import type { UserRole } from '../../models';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.createStaffUser(req.body);
  return created(res, user, 'Staff account created');
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, role, search } = req.query as unknown as {
    page: number;
    limit: number;
    role?: UserRole;
    search?: string;
  };
  const { items, pagination } = await usersService.listUsers({ page, limit, role, search });
  return paginated(res, items, pagination);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getUser(req.params.id);
  return ok(res, user);
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.updateRole(req.params.id, req.body.role, req.user!.id);
  return ok(res, user, { message: 'Role updated' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await usersService.deleteUser(req.params.id, req.user!.id);
  return ok(res, null, { message: 'User deleted' });
});
