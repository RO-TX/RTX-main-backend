import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/**
 * Append-only login audit trail — every login attempt, success or failure.
 * Unlike RefreshToken (which is session state and TTL-expires with the
 * token), this is a permanent record kept for security/audit visibility.
 */
export interface ILoginLog extends Document {
  _id: Types.ObjectId;
  user?: Types.ObjectId; // absent for failed attempts against an unknown email
  email: string;
  success: boolean;
  reason?: string; // e.g. "invalid_credentials", set only on failure
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const loginLogSchema = new Schema<ILoginLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, required: true, index: true },
    success: { type: Boolean, required: true },
    reason: { type: String },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

loginLogSchema.index({ createdAt: -1 });

export const LoginLog: Model<ILoginLog> =
  (models.LoginLog as Model<ILoginLog>) || model<ILoginLog>('LoginLog', loginLogSchema);
