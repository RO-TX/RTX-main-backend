import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/**
 * Roles: `customer` self-registers and shops. The three STAFF roles —
 * `call_center` < `microadmin` < `admin` — are created by an admin from the
 * dashboard. (Improved from the old site, which only had admin/customer/microadmin.)
 */
export type UserRole = 'customer' | 'call_center' | 'microadmin' | 'admin';

export interface IAddress {
  _id: Types.ObjectId;
  label?: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  mobile: string;
  isDefault: boolean;
}

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
  addresses: Types.DocumentArray<IAddress>;
  createdAt: Date;
  updatedAt: Date;
}

// Same field names as Order.shippingAddress, plus label/isDefault — this is a
// list of independently addressable entries (default _id:true), unlike the
// order's single embedded snapshot (_id:false).
const addressSchema = new Schema<IAddress>({
  label: { type: String, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true, default: 'India' },
  mobile: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

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
    // New vs old site: track OAuth linkage + verification explicitly.
    // unique+sparse: two different people can never end up sharing one Google
    // account's uid, while any number of password-only users keep no value at all.
    googleId: { type: String, unique: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true },
);

/**
 * Strip sensitive fields from any JSON serialisation of a user, and expose
 * `id` (string) alongside `_id` — the auth endpoints (/auth/me, /auth/login)
 * have always hand-built their response with `id`, but the users list/get
 * endpoints just returned the raw doc (`_id` only). The frontend `User` type
 * assumes `.id` everywhere, so plain `_id`-only responses silently broke
 * React keys and any `/users/:id` call built from a list row.
 */
userSchema.set('toJSON', {
  transform(_doc, ret) {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = String(obj._id);
    delete obj.password;
    delete obj.__v;
    return obj;
  },
});

export const User: Model<IUser> = (models.User as Model<IUser>) || model<IUser>('User', userSchema);
