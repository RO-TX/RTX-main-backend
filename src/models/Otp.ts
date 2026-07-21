import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export type OtpPurpose = 'signup' | 'login' | 'email_change';

export interface IOtp extends Document {
  _id: Types.ObjectId;
  email: string;
  codeHash: string; // fixed vs old site: store a hash, never the raw OTP
  purpose: OtpPurpose;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['signup', 'login', 'email_change'], default: 'signup' },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index — Mongo auto-deletes the doc once expiresAt passes (old site lacked this).
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp: Model<IOtp> = (models.Otp as Model<IOtp>) || model<IOtp>('Otp', otpSchema);
