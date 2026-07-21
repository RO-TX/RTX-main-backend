import type { Request, Response } from 'express';
import * as analytics from './analytics.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok } from '../../lib/apiResponse';

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  const data = await analytics.getOverview();
  return ok(res, data);
});

export const revenueSeries = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
  const data = await analytics.getRevenueSeries(days);
  return ok(res, data);
});

export const recentOrders = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 50);
  const data = await analytics.getRecentOrders(limit);
  return ok(res, data);
});
