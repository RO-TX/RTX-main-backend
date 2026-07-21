import { Schema, model, models, type Document, type Model } from 'mongoose';

/** Atomic sequence generator (e.g. for human-readable SKU / order codes). */
export interface ICounter extends Document {
  name: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 1 },
});

export const Counter: Model<ICounter> =
  (models.Counter as Model<ICounter>) || model<ICounter>('Counter', counterSchema);

/** Atomically increment and return the next value for a named sequence. */
export async function nextSequence(name: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return doc!.seq;
}
