import type { Request, Response } from 'express';
import * as addresses from './addresses.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok, created } from '../../lib/apiResponse';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const items = await addresses.listAddresses(req.user!.id);
  return ok(res, items);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const addr = await addresses.createAddress(req.user!.id, req.body);
  return created(res, addr, 'Address added');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const addr = await addresses.updateAddress(req.user!.id, req.params.id, req.body);
  return ok(res, addr, { message: 'Address updated' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const items = await addresses.deleteAddress(req.user!.id, req.params.id);
  return ok(res, items, { message: 'Address removed' });
});

export const setDefault = asyncHandler(async (req: Request, res: Response) => {
  const items = await addresses.setDefaultAddress(req.user!.id, req.params.id);
  return ok(res, items, { message: 'Default address set' });
});
