import { Schema, model, models, type Document, type Model, type Types } from 'mongoose';

export type CategoryType = 'customplushome' | 'customcategory' | 'homecategory';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  catImage: string;
  slug: string;
  description: string;
  products: Types.ObjectId[];
  categoryType: CategoryType;
  createdAt: Date;
  updatedAt: Date;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    catImage: { type: String, required: true },
    slug: { type: String, unique: true, trim: true, index: true },
    description: { type: String, default: '' },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    categoryType: {
      type: String,
      enum: ['customplushome', 'customcategory', 'homecategory'],
      default: 'homecategory',
    },
  },
  { timestamps: true },
);

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name);
  }
  next();
});

export const Category: Model<ICategory> =
  (models.Category as Model<ICategory>) || model<ICategory>('Category', categorySchema);
