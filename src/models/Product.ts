import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export type ProductType = 'homeproduct' | 'customproduct' | 'customplushome';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  skuid: string;
  slug: string;
  name: string;
  images: string[];
  description: string;
  flipkartLink: string;
  amazonLink: string;
  // ── Price breakup ──
  mrp: number; // list/original price (₹) — strikethrough; 0 = no discount shown
  price: number; // selling price (₹), GST-inclusive
  gstRate: number; // GST % applied (for the invoice breakup)
  installationCharge: number; // one-time install add-on (₹), 0 = free/included
  quantity: number; // stock count
  category: Types.ObjectId;
  isTopSeller: boolean;
  productType: ProductType;
  shipment_width: string;
  shipment_height: string;
  shipment_length: string;
  weight: string;
  fragile: boolean;
  warrantyMonths: number;
  hsnCode: string;
  rating: number; // 0-5, admin-set initial value until a real review pipeline exists
  reviewCount: number;
  sequence: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    skuid: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, index: 'text' },
    images: { type: [String], default: [] },
    description: { type: String, default: '' },
    flipkartLink: { type: String, default: '' },
    amazonLink: { type: String, default: '' },
    mrp: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, default: 18, min: 0, max: 100 },
    installationCharge: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    isTopSeller: { type: Boolean, default: false },
    productType: {
      type: String,
      enum: ['homeproduct', 'customproduct', 'customplushome'],
      default: 'homeproduct',
    },
    shipment_width: { type: String, default: '' },
    shipment_height: { type: String, default: '' },
    shipment_length: { type: String, default: '' },
    weight: { type: String, default: '' },
    fragile: { type: Boolean, default: false },
    warrantyMonths: { type: Number, default: 12, min: 0 },
    hsnCode: { type: String, default: '' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    sequence: { type: Number, default: 147777777777 },
    // New vs old site: soft-disable a product without deleting it
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

/**
 * priceBreakup — computed line-item breakdown for display/invoices.
 * `price` is treated as GST-inclusive; base is backed out from gstRate.
 */
productSchema.virtual('priceBreakup').get(function (this: IProduct) {
  const hasDiscount = this.mrp > this.price;
  const base = this.gstRate > 0 ? this.price / (1 + this.gstRate / 100) : this.price;
  return {
    mrp: this.mrp,
    price: this.price,
    discount: hasDiscount ? Math.round(this.mrp - this.price) : 0,
    discountPercent: hasDiscount ? Math.round(((this.mrp - this.price) / this.mrp) * 100) : 0,
    basePrice: Math.round(base),
    gstRate: this.gstRate,
    gstAmount: Math.round(this.price - base),
    installationCharge: this.installationCharge,
    total: this.price + this.installationCharge,
  };
});

export const Product: Model<IProduct> =
  (models.Product as Model<IProduct>) || model<IProduct>('Product', productSchema);
