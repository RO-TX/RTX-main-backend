import crypto from 'crypto';
import { Order, Product, type OrderStatus, type IShippingAddress, type IGuestCustomer } from '../../models';
import { ApiError } from '../../lib/ApiError';
import { notify } from '../notifications/notifications.service';

/* ── Admin: list / get / update ── */

export interface ListOrdersParams {
  page: number;
  limit: number;
  status?: OrderStatus;
  paymentStatus?: string;
  search?: string; // orderId
}

export async function listOrders(params: ListOrdersParams) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.paymentStatus) filter.paymentStatus = params.paymentStatus;
  if (params.search) filter.orderId = { $regex: params.search, $options: 'i' };

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .populate('user', 'firstName lastName email')
      .populate('createdByStaff', 'firstName lastName')
      .populate('items.product', 'name skuid images'),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function getOrder(id: string) {
  const order = await Order.findById(id)
    .populate('user', 'firstName lastName email mobile')
    .populate('createdByStaff', 'firstName lastName')
    .populate('items.product', 'name skuid images price');
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

const ALLOWED_STATUS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'custom_build',
  'orderplaced',
];

export async function updateOrderStatus(id: string, status: OrderStatus, adminNotes?: string) {
  if (!ALLOWED_STATUS.includes(status)) throw ApiError.badRequest('Invalid status');
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  order.status = status;
  if (adminNotes !== undefined) order.adminNotes = adminNotes;
  if (status === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();

  // Restock if an order is cancelled/refunded (reverse the decrement).
  if ((status === 'cancelled' || status === 'refunded') && order.paymentStatus !== 'refunded') {
    await restock(order.items);
  }
  await order.save();
  return order;
}

/* ── Customer: place / list own ── */

export interface PlaceOrderInput {
  items: Array<{ product: string; quantity: number }>;
  shippingAddress: IShippingAddress;
  paymentMethod: 'cod' | 'razorpay';
  notes?: string;
}

export interface ManualOrderInput {
  items: Array<{ product: string; quantity: number }>;
  guestCustomer: IGuestCustomer;
  shippingAddress: IShippingAddress;
  paymentMethod: 'cod' | 'razorpay' | 'bank_transfer' | 'upi' | 'card' | 'wallet';
  status: OrderStatus;
  notes?: string;
}

function genOrderId(): string {
  return `RTX_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

interface CreateOrderParams {
  items: Array<{ product: string; quantity: number }>;
  shippingAddress: IShippingAddress;
  paymentMethod: string;
  status: OrderStatus;
  notes?: string;
  user?: string;
  guestCustomer?: IGuestCustomer;
  createdByStaff?: string;
}

/**
 * Creates an order and DECREMENTS stock atomically per item — the old site never
 * decremented stock, allowing oversells. Each decrement is guarded by
 * `quantity >= requested` so two concurrent orders can't drive stock negative.
 * Shared by both customer checkout and staff-entered manual orders.
 */
async function createOrder(params: CreateOrderParams) {
  if (!params.items.length) throw ApiError.badRequest('Order has no items');

  // Load products + validate availability up front.
  const productIds = params.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const lineItems = params.items.map((i) => {
    const p = byId.get(i.product);
    if (!p) throw ApiError.badRequest(`Product ${i.product} not found or inactive`);
    if (i.quantity < 1) throw ApiError.badRequest('Quantity must be at least 1');
    if (p.quantity < i.quantity) {
      throw ApiError.conflict(`Insufficient stock for "${p.name}" (${p.quantity} left)`);
    }
    return { product: p._id, quantity: i.quantity, price: p.price };
  });

  const totalAmount = lineItems.reduce((sum, li) => sum + li.price * li.quantity, 0);

  // Decrement stock with a conditional update; roll back on any failure.
  const decremented: Array<{ id: string; qty: number }> = [];
  try {
    for (const li of lineItems) {
      const result = await Product.updateOne(
        { _id: li.product, quantity: { $gte: li.quantity } },
        { $inc: { quantity: -li.quantity } },
      );
      if (result.modifiedCount !== 1) {
        throw ApiError.conflict('Stock changed during checkout. Please try again.');
      }
      decremented.push({ id: li.product.toString(), qty: li.quantity });
    }

    const order = await Order.create({
      user: params.user,
      guestCustomer: params.guestCustomer,
      createdByStaff: params.createdByStaff,
      orderId: genOrderId(),
      items: lineItems,
      totalAmount,
      status: params.status,
      shippingAddress: params.shippingAddress,
      paymentMethod: params.paymentMethod,
      paymentStatus: 'pending',
      notes: params.notes,
    });

    const customerLabel = params.guestCustomer?.name ?? 'a customer';
    await notify({
      type: 'order',
      title: 'New order placed',
      message: `${order.orderId} — ₹${totalAmount.toLocaleString('en-IN')} from ${customerLabel}`,
      link: `/orders/${order._id}`,
    });

    return order;
  } catch (err) {
    // Compensating rollback of any stock already decremented.
    await Promise.all(
      decremented.map((d) =>
        Product.updateOne({ _id: d.id }, { $inc: { quantity: d.qty } }).catch(() => undefined),
      ),
    );
    throw err;
  }
}

export async function placeOrder(userId: string, input: PlaceOrderInput) {
  return createOrder({
    items: input.items,
    shippingAddress: input.shippingAddress,
    paymentMethod: input.paymentMethod,
    status: 'orderplaced',
    notes: input.notes,
    user: userId,
  });
}

/** Staff-entered walk-in/phone order — no linked customer account required. */
export async function placeManualOrder(staffId: string, input: ManualOrderInput) {
  return createOrder({
    items: input.items,
    shippingAddress: input.shippingAddress,
    paymentMethod: input.paymentMethod,
    status: input.status,
    notes: input.notes,
    guestCustomer: input.guestCustomer,
    createdByStaff: staffId,
  });
}

async function restock(items: Array<{ product: unknown; quantity?: number }>) {
  await Promise.all(
    items.map((i) =>
      Product.updateOne({ _id: i.product }, { $inc: { quantity: i.quantity ?? 0 } }).catch(
        () => undefined,
      ),
    ),
  );
}

export async function listMyOrders(userId: string, page: number, limit: number) {
  const filter = { user: userId };
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('items.product', 'name skuid images'),
    Order.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
