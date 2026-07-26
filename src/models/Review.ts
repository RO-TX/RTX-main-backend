import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/** Homepage testimonials — NOT product reviews (no product link). */
export interface IReview extends Document {
  _id: Types.ObjectId;
  image: string;
  name: string;
  position: string;
  description: string;
  rating: number;
  location: string;
  featured: boolean;
  /** Who authored this testimonial — staff-curated vs. a real customer submission. */
  source: 'admin' | 'customer';
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    image: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: String, required: true },
    description: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    location: { type: String, trim: true, default: '' },
    featured: { type: Boolean, default: false },
    source: { type: String, enum: ['admin', 'customer'], default: 'admin' },
  },
  { timestamps: true },
);

export const Review: Model<IReview> =
  (models.Review as Model<IReview>) || model<IReview>('Review', reviewSchema);
