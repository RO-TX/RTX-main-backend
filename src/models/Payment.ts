import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  paymentId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  orderId?: Types.ObjectId;
  orderNumber: string;
  userId?: Types.ObjectId;
  repairRequestId?: Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: 'razorpay' | 'cod' | 'upi' | 'card' | 'netbanking' | 'wallet';
  paymentStatus: PaymentStatus;
  gateway: 'razorpay' | 'manual' | 'cod';
  gatewayTransactionId?: string;
  gatewayResponse?: unknown;
  isVerified: boolean;
  verifiedAt?: Date;
  verificationMethod?: 'signature' | 'webhook' | 'manual';
  refunds: Array<{
    refundId?: string;
    amount?: number;
    reason?: string;
    status: 'pending' | 'processed' | 'failed';
    processedAt?: Date;
    refundTransactionId?: string;
  }>;
  totalRefunded: number;
  attempts: Array<{
    attemptedAt: Date;
    status: 'initiated' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
    gatewayResponse?: unknown;
  }>;
  receiptId: string;
  description?: string;
  notes?: unknown;
  initiatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, sparse: true },
    razorpayOrderId: { type: String, sparse: true },
    razorpaySignature: { type: String, sparse: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    orderNumber: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    repairRequestId: { type: Schema.Types.ObjectId, ref: 'RepairRequest' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cod', 'upi', 'card', 'netbanking', 'wallet'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      required: true,
      default: 'pending',
    },
    gateway: { type: String, enum: ['razorpay', 'manual', 'cod'], default: 'razorpay' },
    gatewayTransactionId: { type: String, sparse: true },
    gatewayResponse: Schema.Types.Mixed,
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verificationMethod: { type: String, enum: ['signature', 'webhook', 'manual'] },
    refunds: [
      {
        refundId: String,
        amount: Number,
        reason: String,
        status: { type: String, enum: ['pending', 'processed', 'failed'] },
        processedAt: Date,
        refundTransactionId: String,
      },
    ],
    totalRefunded: { type: Number, default: 0 },
    attempts: [
      {
        attemptedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['initiated', 'processing', 'completed', 'failed'] },
        errorMessage: String,
        gatewayResponse: Schema.Types.Mixed,
      },
    ],
    receiptId: { type: String, required: true },
    description: String,
    notes: Schema.Types.Mixed,
    initiatedAt: { type: Date, default: Date.now },
    completedAt: Date,
    failedAt: Date,
  },
  { timestamps: true },
);

paymentSchema.virtual('netAmount').get(function (this: IPayment) {
  return this.amount - this.totalRefunded;
});

export const Payment: Model<IPayment> =
  (models.Payment as Model<IPayment>) || model<IPayment>('Payment', paymentSchema);
