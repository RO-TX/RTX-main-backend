import { Order } from '../../models';
import { ApiError } from '../../lib/ApiError';
import { logger } from '../../lib/logger';
import { env } from '../../config/env';
import * as delhivery from '../../lib/delhivery';
import * as orders from '../orders/orders.service';

interface Consignee {
  name: string;
  phone: string;
}

function consigneeOf(order: {
  user?: { firstName?: string; lastName?: string } | null;
  guestCustomer?: { name?: string };
  shippingAddress: { mobile: string };
}): Consignee {
  const name = order.user
    ? `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim()
    : (order.guestCustomer?.name ?? 'Customer');
  return { name: name || 'Customer', phone: order.shippingAddress.mobile };
}

/**
 * Creates a Delhivery shipment for an order and stamps `order.shipping`.
 * Idempotent — a second call on an already-shipped order is a no-op, so the
 * auto-create-on-confirm hook and the manual "retry" button can both call
 * this safely.
 */
export async function createShipmentForOrder(orderId: string) {
  const order = await Order.findById(orderId).populate<{
    user?: { firstName?: string; lastName?: string } | null;
  }>('user', 'firstName lastName');
  if (!order) throw ApiError.notFound('Order not found');
  if (order.shipping?.waybill) return order; // already shipped

  const consignee = consigneeOf(order);
  const quantity = order.items.reduce((sum, it) => sum + it.quantity, 0) || 1;

  const result = await delhivery.createShipment({
    orderId: order.orderId,
    consignee: {
      name: consignee.name,
      phone: consignee.phone,
      address: order.shippingAddress.address,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      pin: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
    },
    paymentMode: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
    codAmount: order.totalAmount,
    totalAmount: order.totalAmount,
    quantity,
  });

  order.shipping = {
    ...order.shipping,
    waybill: result.waybill,
    carrierName: 'Delhivery',
    shippingMethod: order.shipping?.shippingMethod ?? 'Surface',
    pickupScheduled: true,
    trackingHistory: [
      ...(order.shipping?.trackingHistory ?? []),
      {
        status: 'Manifested',
        location: env.DELHIVERY_PICKUP_LOCATION || 'Warehouse',
        timestamp: new Date(),
        description: 'Shipment created',
      },
    ],
  };
  order.delhiveryData = result.raw;
  await order.save();

  logger.info(`[shipping] shipment created for order ${order.orderId} — waybill ${result.waybill}`);
  return order;
}

/** Manual pull — the full scan history from Delhivery, so it replaces (not appends). */
export async function syncTracking(orderId: string) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (!order.shipping?.waybill) throw ApiError.badRequest('No shipment created for this order yet');

  const scans = await delhivery.trackShipment(order.shipping.waybill);
  order.shipping.trackingHistory = scans.map((s) => ({
    status: s.status,
    location: s.location,
    timestamp: s.timestamp ? new Date(s.timestamp) : undefined,
    description: s.description,
  }));
  await order.save();
  return order;
}

export interface WebhookPayload {
  AWB?: string;
  Status?: string;
  StatusDateTime?: string;
  StatusLocation?: string;
  Instructions?: string;
}

/**
 * Appends one incremental scan pushed by Delhivery. Only flips `order.status`
 * on unambiguous terminal scans — Delhivery's status vocabulary is far wider
 * than our OrderStatus enum, and a wrong guess is worse than no mapping.
 */
export async function handleWebhookEvent(payload: WebhookPayload): Promise<void> {
  if (!payload.AWB) return;

  const order = await Order.findOne({ 'shipping.waybill': payload.AWB });
  if (!order) {
    logger.warn(`[shipping] webhook for unknown waybill ${payload.AWB}`);
    return;
  }

  order.shipping = order.shipping ?? {};
  order.shipping.trackingHistory = [
    ...(order.shipping.trackingHistory ?? []),
    {
      status: payload.Status,
      location: payload.StatusLocation,
      timestamp: payload.StatusDateTime ? new Date(payload.StatusDateTime) : new Date(),
      description: payload.Instructions,
    },
  ];
  await order.save();

  const statusText = (payload.Status ?? '').toLowerCase();
  if (statusText.includes('delivered')) {
    await orders.updateOrderStatus(String(order._id), 'delivered');
  } else if (statusText.includes('rto') || statusText.includes('cancel')) {
    await orders.updateOrderStatus(String(order._id), 'cancelled');
  }
}
