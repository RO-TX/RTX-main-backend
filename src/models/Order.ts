import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'custom_build'
  | 'orderplaced';

export type PaymentMethod = 'cod' | 'razorpay' | 'bank_transfer' | 'upi' | 'card' | 'wallet';
export type OrderPaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
}

export interface IShippingAddress {
  address: string;
  state: string;
  city: string;
  postalCode: string;
  country: string;
  mobile: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  orderId: string;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: IShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: OrderPaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  transactionId?: string;
  receiptId?: string;
  paymentAttempts: Array<{
    attemptedAt: Date;
    status: 'initiated' | 'failed' | 'success';
    failureReason?: string;
    paymentId?: string;
    amount?: number;
  }>;
  refunds: Array<{
    refundId?: string;
    amount?: number;
    reason?: string;
    status: 'pending' | 'processed' | 'failed';
    processedAt?: Date;
    createdAt: Date;
  }>;
  paidAt?: Date;
  deliveredAt?: Date;
  shipping?: {
    waybill?: string;
    trackingUrl?: string;
    shippingCost?: number;
    estimatedDelivery?: Date;
    carrierName?: string;
    shippingMethod?: string;
    shipmentId?: string;
    pickupScheduled?: boolean;
    trackingHistory?: Array<{
      status?: string;
      location?: string;
      timestamp?: Date;
      description?: string;
    }>;
  };
  warehouse?: Types.ObjectId; // fixed vs old site: was a plain string
  delhiveryData?: unknown;
  notes?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, min: 1 },
    price: { type: Number },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    address: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    mobile: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
        'custom_build',
        'orderplaced',
      ],
      default: 'pending',
      index: true,
    },
    shippingAddress: { type: shippingAddressSchema, required: true },
    paymentMethod: {
      type: String,
      enum: ['cod', 'razorpay', 'bank_transfer', 'upi', 'card', 'wallet'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    transactionId: String,
    receiptId: String,
    paymentAttempts: [
      {
        attemptedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['initiated', 'failed', 'success'] },
        failureReason: String,
        paymentId: String,
        amount: Number,
      },
    ],
    refunds: [
      {
        refundId: String,
        amount: Number,
        reason: String,
        status: { type: String, enum: ['pending', 'processed', 'failed'] },
        processedAt: Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    paidAt: Date,
    deliveredAt: Date,
    shipping: {
      waybill: String,
      trackingUrl: String,
      shippingCost: Number,
      estimatedDelivery: Date,
      carrierName: { type: String, default: 'Delhivery' },
      shippingMethod: { type: String, default: 'Surface' },
      shipmentId: String,
      pickupScheduled: { type: Boolean, default: false },
      trackingHistory: [
        {
          status: String,
          location: String,
          timestamp: Date,
          description: String,
        },
      ],
    },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    delhiveryData: Schema.Types.Mixed,
    notes: String,
    adminNotes: String,
  },
  { timestamps: true },
);

export const Order: Model<IOrder> =
  (models.Order as Model<IOrder>) || model<IOrder>('Order', orderSchema);
