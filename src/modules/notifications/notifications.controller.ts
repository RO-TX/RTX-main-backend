import type { Request, Response } from 'express';
import * as notifications from './notifications.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok } from '../../lib/apiResponse';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { page: number; limit: number; unreadOnly?: boolean };
  const { items, pagination, unreadCount } = await notifications.listNotifications(req.user!.id, q);
  return ok(res, items, { meta: { pagination, unreadCount } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const n = await notifications.markRead(req.params.id, req.user!.id);
  return ok(res, n);
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notifications.markAllRead(req.user!.id);
  return ok(res, null, { message: 'All notifications marked read' });
});
