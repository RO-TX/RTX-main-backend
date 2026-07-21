import type { Request, Response } from 'express';
import * as orders from './orders.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok, created, paginated } from '../../lib/apiResponse';

/* ── Admin ── */

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as orders.ListOrdersParams;
  const { items, pagination } = await orders.listOrders(q);
  return paginated(res, items, pagination);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const order = await orders.getOrder(req.params.id);
  return ok(res, order);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await orders.updateOrderStatus(req.params.id, req.body.status, req.body.adminNotes);
  return ok(res, order, { message: 'Order status updated' });
});

/* ── Customer ── */

export const place = asyncHandler(async (req: Request, res: Response) => {
  const order = await orders.placeOrder(req.user!.id, req.body);
  return created(res, order, 'Order placed');
});

export const myOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, pagination } = await orders.listMyOrders(req.user!.id, page, limit);
  return paginated(res, items, pagination);
});
