import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export type NotificationType = 'order' | 'amc_enquiry' | 'repair_request';

/** Shared staff inbox — one row per event, `readBy` tracks which staff have seen it. */
export interface INotification extends Document {
  _id: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    type: { type: String, enum: ['order', 'amc_enquiry', 'repair_request'], required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, required: true },
    readBy: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: true },
);

notificationSchema.index({ createdAt: -1 });

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) || model<INotification>('Notification', notificationSchema);
