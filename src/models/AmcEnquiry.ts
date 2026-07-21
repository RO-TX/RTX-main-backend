import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export interface IAmcEnquiry extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  address: string;
  mobile: string;
  message?: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const amcEnquirySchema = new Schema<IAmcEnquiry>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String, required: true },
    mobile: { type: String, required: true },
    message: { type: String },
    // New vs old site: track lead lifecycle so admin can work the pipeline
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  },
  { timestamps: true }, // fixed vs old site: proper timestamps instead of manual createdAt
);

export const AmcEnquiry: Model<IAmcEnquiry> =
  (models.AMCEnquiry as Model<IAmcEnquiry>) || model<IAmcEnquiry>('AMCEnquiry', amcEnquirySchema);
