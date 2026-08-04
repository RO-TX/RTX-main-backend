import crypto from 'crypto';
import { env } from '../config/env';
import { ApiError } from './ApiError';
import { logger } from './logger';

/**
 * Thin wrapper around Delhivery's Express (last-mile) API. No business logic
 * here — order/webhook interpretation lives in the `shipping` module.
 *
 * Field shapes are transcribed from Delhivery's public API docs
 * (delhivery-express-api-doc.readme.io), which are incomplete on the exact
 * response envelope — verify against a real staging call once
 * DELHIVERY_API_KEY is set. Until then MOCK_SHIPPING_ENABLED keeps every
 * caller working against synthetic data.
 */

function baseUrl(): string {
  return env.DELHIVERY_ENVIRONMENT === 'production'
    ? 'https://track.delhivery.com'
    : 'https://staging-express.delhivery.com';
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Token ${env.DELHIVERY_API_KEY ?? ''}` };
}

export interface DelhiveryConsignee {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  country: string;
}

export interface CreateShipmentInput {
  orderId: string; // our orderId, used as Delhivery's `order` field
  consignee: DelhiveryConsignee;
  paymentMode: 'COD' | 'Prepaid';
  codAmount: number;
  totalAmount: number;
  quantity: number;
}

export interface DelhiveryShipmentResult {
  waybill: string;
  raw: unknown;
}

function mockWaybill(): string {
  return `MOCK-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

export async function createShipment(
  input: CreateShipmentInput,
): Promise<DelhiveryShipmentResult> {
  if (env.MOCK_SHIPPING_ENABLED) {
    const waybill = mockWaybill();
    logger.info(`[delhivery] mock mode — synthetic waybill ${waybill} for order ${input.orderId}`);
    return { waybill, raw: { mock: true } };
  }

  const payload = {
    shipments: [
      {
        name: input.consignee.name,
        add: input.consignee.address,
        city: input.consignee.city,
        state: input.consignee.state,
        country: input.consignee.country,
        pin: input.consignee.pin,
        phone: input.consignee.phone,
        order: input.orderId,
        payment_mode: input.paymentMode,
        cod_amount: input.paymentMode === 'COD' ? input.codAmount : 0,
        total_amount: input.totalAmount,
        quantity: input.quantity,
        products_desc: 'RO Water Purifier / Parts',
        hsn_code: env.DELHIVERY_HSN_CODE ?? '',
        seller_gst_tin: env.DELHIVERY_SELLER_GST_TIN ?? '',
        seller_name: env.DELHIVERY_CLIENT_NAME ?? '',
        weight: env.DELHIVERY_DEFAULT_WEIGHT_GRAMS,
        shipping_mode: 'Surface',
        address_type: 'home',
      },
    ],
    pickup_location: { name: env.DELHIVERY_PICKUP_LOCATION ?? '' },
  };

  const body = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

  const res = await fetch(`${baseUrl()}/api/cmu/create.json`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    packages?: Array<{ waybill?: string; status?: string; remarks?: unknown }>;
  } | null;

  const pkg = json?.packages?.[0];
  if (!res.ok || !json?.success || !pkg?.waybill) {
    logger.error('[delhivery] shipment creation failed', json ?? { status: res.status });
    throw ApiError.internal('Delhivery shipment creation failed', json ?? undefined);
  }

  return { waybill: pkg.waybill, raw: json };
}

export interface TrackedScan {
  status?: string;
  location?: string;
  timestamp?: string;
  description?: string;
}

export async function trackShipment(waybill: string): Promise<TrackedScan[]> {
  if (env.MOCK_SHIPPING_ENABLED || waybill.startsWith('MOCK-')) {
    return [
      {
        status: 'Manifested',
        location: env.DELHIVERY_PICKUP_LOCATION || 'Warehouse',
        timestamp: new Date().toISOString(),
        description: 'Mock scan — MOCK_SHIPPING_ENABLED is on',
      },
    ];
  }

  const res = await fetch(`${baseUrl()}/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`, {
    headers: authHeaders(),
  });
  const json = (await res.json().catch(() => null)) as {
    ShipmentData?: Array<{ Shipment?: { Scans?: Array<{ ScanDetail?: TrackedScan }> } }>;
  } | null;

  if (!res.ok || !json) {
    logger.error('[delhivery] tracking fetch failed', { waybill, status: res.status });
    throw ApiError.internal('Delhivery tracking fetch failed');
  }

  const scans = json.ShipmentData?.[0]?.Shipment?.Scans ?? [];
  return scans.map((s) => s.ScanDetail ?? {});
}
