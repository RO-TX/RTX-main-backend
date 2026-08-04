import type { Request, Response } from 'express';
import * as shipping from './shipping.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok } from '../../lib/apiResponse';
import { env } from '../../config/env';

export const createShipment = asyncHandler(async (req: Request, res: Response) => {
  const order = await shipping.createShipmentForOrder(req.params.orderId);
  return ok(res, order, { message: 'Shipment created' });
});

export const syncTracking = asyncHandler(async (req: Request, res: Response) => {
  const order = await shipping.syncTracking(req.params.orderId);
  return ok(res, order, { message: 'Tracking synced' });
});

/**
 * Public — Delhivery has no self-serve webhook registration or documented
 * signature scheme, so the shared secret in the URL path is the only gate.
 * A mismatch looks like "route doesn't exist" (404) rather than "wrong key"
 * (401), so the real path can't be found by probing.
 */
export const webhook = asyncHandler(async (req: Request, res: Response) => {
  if (!env.DELHIVERY_WEBHOOK_SECRET || req.params.secret !== env.DELHIVERY_WEBHOOK_SECRET) {
    res.status(404).end();
    return;
  }
  await shipping.handleWebhookEvent(req.body);
  // Always 200 quickly — Delhivery's own guidance is to consume scans, not
  // hard-fail on ones that don't resolve to a known order.
  res.status(200).json({ success: true });
});
