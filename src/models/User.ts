import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/**
 * Roles: `customer` self-registers and shops. The three STAFF roles —
 * `call_center` < `microadmin` < `admin` — are created by an admin from the
 * dashboard. (Improved from the old site, which only had admin/customer/microadmin.)
 */
export type UserRole = 'customer' | 'call_center' | 'microadmin' | 'admin';

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  image: string;
  password: string; // bcrypt hash; "" for OAuth-only accounts
  role: UserRole;
  googleId?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    mobile: { type: String, default: '' },
    image: { type: String, default: '/images/avatar.png' },
    password: { type: String, default: '' },
    role: {
      type: String,
      enum: ['customer', 'call_center', 'microadmin', 'admin'],
      default: 'customer',
      index: true,
    },
    // New vs old site: track OAuth linkage + verification explicitly
    googleId: { type: String, sparse: true },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/** Strip sensitive fields from any JSON serialisation of a user. */
userSchema.set('toJSON', {
  transform(_doc, ret) {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.password;
    delete obj.__v;
    return obj;
  },
});

export const User: Model<IUser> = (models.User as Model<IUser>) || model<IUser>('User', userSchema);
