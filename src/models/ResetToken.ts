import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export interface IResetToken extends Document {
  _id: Types.ObjectId;
  email: string;
  tokenHash: string; // fixed vs old site: store a hash of the token, not the raw value
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const resetTokenSchema = new Schema<IResetToken>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index — auto-clean expired tokens (old site lacked this).
resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ResetToken: Model<IResetToken> =
  (models.ResetToken as Model<IResetToken>) || model<IResetToken>('ResetToken', resetTokenSchema);
