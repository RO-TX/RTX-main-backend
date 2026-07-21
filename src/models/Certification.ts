import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export interface ICertification extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  issuedBy: string;
  issueDate: Date;
  expiryDate: Date;
  image: string;
  verificationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const certificationSchema = new Schema<ICertification>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true },
    issuedBy: { type: String, required: true, trim: true },
    issueDate: { type: Date, required: true },
    expiryDate: {
      type: Date,
      required: true,
      validate: {
        validator(this: ICertification, value: Date) {
          return value > this.issueDate;
        },
        message: 'expiryDate must be after issueDate',
      },
    },
    image: { type: String, required: true, trim: true },
    verificationId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Certification: Model<ICertification> =
  (models.Certification as Model<ICertification>) ||
  model<ICertification>('Certification', certificationSchema);
