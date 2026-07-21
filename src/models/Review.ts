import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

/** Homepage testimonials — NOT product reviews (no product link). */
export interface IReview extends Document {
  _id: Types.ObjectId;
  image: string;
  name: string;
  position: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    image: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

export const Review: Model<IReview> =
  (models.Review as Model<IReview>) || model<IReview>('Review', reviewSchema);
