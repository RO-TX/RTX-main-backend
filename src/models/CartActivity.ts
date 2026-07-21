import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export interface ICartItem {
  productId: Types.ObjectId;
  skuid: string;
  title: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image?: string;
  updatedAt: Date;
}

export interface ICartActivity extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  items: ICartItem[];
  totalQuantity: number;
  totalValue: number;
  sessionId?: string;
  lastViewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    skuid: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: Number,
    quantity: { type: Number, default: 1 },
    image: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cartActivitySchema = new Schema<ICartActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    totalQuantity: { type: Number, required: true, default: 0 },
    totalValue: { type: Number, required: true, default: 0 },
    sessionId: { type: String, index: true },
    lastViewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

cartActivitySchema.index({ userId: 1, updatedAt: -1 });
cartActivitySchema.index({ createdAt: -1 });

/**
 * Recompute totals on save. NOTE: the service layer must compute these too when
 * using findOneAndUpdate (which bypasses this hook) — that was the old site's
 * "totals always 0" bug. See cart.service recomputeTotals().
 */
cartActivitySchema.pre('save', function (next) {
  this.totalQuantity = this.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  this.totalValue = this.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
  next();
});

export const CartActivity: Model<ICartActivity> =
  (models.CartActivity as Model<ICartActivity>) ||
  model<ICartActivity>('CartActivity', cartActivitySchema);
