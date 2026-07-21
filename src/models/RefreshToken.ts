import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/**
 * Persisted refresh tokens, enabling real revocation (logout, "log out
 * everywhere", rotation-on-refresh). The old site's single dual-auth cookie
 * could not be revoked server-side — this fixes that.
 *
 * We store only the SHA-256 hash of the token plus its jti; the raw token lives
 * solely in the client's httpOnly cookie.
 */
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  jti: string;
  tokenHash: string;
  userAgent?: string;
  ip?: string;
  revokedAt?: Date;
  replacedByJti?: string;
  expiresAt: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String, required: true },
    userAgent: { type: String },
    ip: { type: String },
    revokedAt: { type: Date },
    replacedByJti: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL: drop the row once it's expired.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<IRefreshToken> =
  (models.RefreshToken as Model<IRefreshToken>) ||
  model<IRefreshToken>('RefreshToken', refreshTokenSchema);
