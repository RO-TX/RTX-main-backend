import type { Request, Response } from 'express';
import * as cart from './cart.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok } from '../../lib/apiResponse';

function identityOf(req: Request): cart.CartIdentity {
  return {
    userId: req.user?.id,
    sessionId: (req.header('x-cart-session') || undefined) as string | undefined,
  };
}

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const doc = await cart.getOrCreateCart(identityOf(req));
  return ok(res, doc);
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity } = req.body as { productId: string; quantity: number };
  const doc = await cart.addItem(identityOf(req), productId, quantity);
  return ok(res, doc, { status: 201, message: 'Added to cart' });
});

export const setQuantity = asyncHandler(async (req: Request, res: Response) => {
  const { quantity } = req.body as { quantity: number };
  const doc = await cart.setQuantity(identityOf(req), req.params.productId, quantity);
  return ok(res, doc);
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const doc = await cart.removeItem(identityOf(req), req.params.productId);
  return ok(res, doc);
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const doc = await cart.clearCart(identityOf(req));
  return ok(res, doc);
});
