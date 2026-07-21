import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export interface IWarehouse extends Document {
  _id: Types.ObjectId;
  name: string;
  registered_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pin: string;
  country: string;
  return_address?: string;
  return_city?: string;
  return_state?: string;
  return_pin?: string;
  return_country?: string;
  status: 'active' | 'inactive' | 'suspended';
  delhivery_client?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseSchema = new Schema<IWarehouse>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    registered_name: { type: String, required: true, trim: true, maxlength: 150 },
    phone: { type: String, required: true, unique: true, match: /^\d{10}$/ },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    city: { type: String, required: true, trim: true, maxlength: 50 },
    pin: { type: String, required: true, match: /^\d{6}$/ },
    country: { type: String, default: 'India', maxlength: 50 },
    return_address: { type: String, trim: true },
    return_city: { type: String, trim: true },
    return_state: { type: String, trim: true },
    return_pin: { type: String, match: /^\d{6}$/ },
    return_country: { type: String, default: 'India' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    delhivery_client: { type: String, default: null },
  },
  { timestamps: true },
);

// Copy primary address → return address when the return block is left blank.
warehouseSchema.pre('save', function (next) {
  if (!this.return_address) this.return_address = this.address;
  if (!this.return_city) this.return_city = this.city;
  if (!this.return_pin) this.return_pin = this.pin;
  if (!this.return_country) this.return_country = this.country;
  next();
});

export const Warehouse: Model<IWarehouse> =
  (models.Warehouse as Model<IWarehouse>) || model<IWarehouse>('Warehouse', warehouseSchema);
