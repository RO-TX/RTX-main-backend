import { CartActivity, Product, type ICartItem } from '../../models';
import { ApiError } from '../../lib/ApiError';

export interface CartIdentity {
  userId?: string;
  sessionId?: string;
}

function identityFilter({ userId, sessionId }: CartIdentity) {
  if (userId) return { userId };
  if (sessionId) return { sessionId };
  throw ApiError.badRequest('Missing cart identity: send an x-cart-session header or log in');
}

/** Recompute totals — mirrors the pre('save') hook, needed because findOneAndUpdate bypasses it. */
function recomputeTotals(items: ICartItem[]) {
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalValue = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
  return { totalQuantity, totalValue };
}

export async function getOrCreateCart(identity: CartIdentity) {
  const filter = identityFilter(identity);
  let cart = await CartActivity.findOne(filter);
  if (!cart) {
    cart = await CartActivity.create({
      ...filter,
      items: [],
      totalQuantity: 0,
      totalValue: 0,
      lastViewedAt: new Date(),
    });
  } else {
    cart.lastViewedAt = new Date();
    await cart.save();
  }
  return cart;
}

export async function addItem(identity: CartIdentity, productId: string, quantity: number) {
  const filter = identityFilter(identity);
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  let cart = await CartActivity.findOne(filter);
  if (!cart) cart = new CartActivity({ ...filter, items: [] });

  const existing = cart.items.find((i) => i.productId.toString() === productId);
  if (existing) {
    existing.quantity += quantity;
    existing.price = product.price;
    existing.title = product.name;
    existing.image = product.images[0];
    existing.updatedAt = new Date();
  } else {
    cart.items.push({
      productId: product._id,
      skuid: product.skuid,
      title: product.name,
      price: product.price,
      originalPrice: product.mrp || undefined,
      quantity,
      image: product.images[0],
      updatedAt: new Date(),
    });
  }

  const { totalQuantity, totalValue } = recomputeTotals(cart.items);
  cart.totalQuantity = totalQuantity;
  cart.totalValue = totalValue;
  cart.lastViewedAt = new Date();
  await cart.save();
  return cart;
}

export async function setQuantity(identity: CartIdentity, productId: string, quantity: number) {
  const filter = identityFilter(identity);
  const cart = await CartActivity.findOne(filter);
  if (!cart) throw ApiError.notFound('Cart not found');

  if (quantity === 0) {
    cart.items = cart.items.filter((i) => i.productId.toString() !== productId) as typeof cart.items;
  } else {
    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) throw ApiError.notFound('Item not in cart');
    item.quantity = quantity;
    item.updatedAt = new Date();
  }

  const { totalQuantity, totalValue } = recomputeTotals(cart.items);
  cart.totalQuantity = totalQuantity;
  cart.totalValue = totalValue;
  await cart.save();
  return cart;
}

export async function removeItem(identity: CartIdentity, productId: string) {
  return setQuantity(identity, productId, 0);
}

export async function clearCart(identity: CartIdentity) {
  const filter = identityFilter(identity);
  const cart = await CartActivity.findOne(filter);
  if (!cart) throw ApiError.notFound('Cart not found');
  cart.items = [];
  cart.totalQuantity = 0;
  cart.totalValue = 0;
  await cart.save();
  return cart;
}
