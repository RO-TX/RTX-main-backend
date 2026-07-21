import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';
import crypto from 'crypto';

export interface IRepairAttachment {
  url: string;
  type: 'image' | 'video';
  filename?: string;
  size?: number; // bytes
  uploadedAt: Date;
}

export interface IRepairRequest extends Document {
  _id: Types.ObjectId;
  requestId: string;
  name: string;
  email: string;
  mobile: string;
  pincode: string;
  district: string;
  city: string;
  address: string;
  status: 'pending' | 'completed';
  description: string;
  // Photos/videos of the fault, uploaded by the customer; visible to admin.
  attachments: IRepairAttachment[];
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  paymentLink?: string;
  amount: number; // in paise (₹249 = 24900)
  createdAt: Date;
  updatedAt: Date;
}

function genRequestId(): string {
  return `REQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

const repairRequestSchema = new Schema<IRepairRequest>(
  {
    requestId: { type: String, required: true, unique: true, default: genRequestId, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    description: { type: String, required: true, trim: true },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          type: { type: String, enum: ['image', 'video'], required: true },
          filename: String,
          size: Number,
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
    },
    paymentLink: { type: String, trim: true },
    amount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const RepairRequest: Model<IRepairRequest> =
  (models.RepairRequest as Model<IRepairRequest>) ||
  model<IRepairRequest>('RepairRequest', repairRequestSchema);
