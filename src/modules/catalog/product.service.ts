import mongoose from 'mongoose';
import { Product, Category, type ProductType } from '../../models';
import { ApiError } from '../../lib/ApiError';

export interface ListProductsParams {
  page: number;
  limit: number;
  category?: string; // category id or slug
  search?: string;
  productType?: ProductType;
  isTopSeller?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'sequence' | 'price_asc' | 'price_desc' | 'newest';
  includeInactive?: boolean;
}

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  sequence: { sequence: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  newest: { createdAt: -1 },
};

export async function listProducts(params: ListProductsParams) {
  const filter: Record<string, unknown> = {};
  if (!params.includeInactive) filter.isActive = true;

  if (params.category) {
    // accept either an ObjectId or a slug
    if (mongoose.isValidObjectId(params.category)) {
      filter.category = params.category;
    } else {
      const cat = await Category.findOne({ slug: params.category }).select('_id').lean();
      filter.category = cat?._id ?? null;
    }
  }
  if (params.productType) filter.productType = params.productType;
  if (params.isTopSeller !== undefined) filter.isTopSeller = params.isTopSeller;
  if (params.search) filter.name = { $regex: params.search, $options: 'i' };
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    filter.price = {};
    if (params.minPrice !== undefined) (filter.price as Record<string, number>).$gte = params.minPrice;
    if (params.maxPrice !== undefined) (filter.price as Record<string, number>).$lte = params.maxPrice;
  }

  const sort = SORT_MAP[params.sort ?? 'sequence'];

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sort)
      .skip((params.page - 1) * params.limit)
      .limit(params.limit),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function getProductBySlug(slug: string) {
  const product = await Product.findOne({ slug }).populate('category', 'name slug');
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

export interface CreateProductInput {
  skuid: string;
  slug: string;
  name: string;
  images: string[];
  description?: string;
  flipkartLink?: string;
  amazonLink?: string;
  mrp?: number;
  price: number;
  gstRate?: number;
  installationCharge?: number;
  quantity: number;
  category: string;
  isTopSeller?: boolean;
  productType?: ProductType;
  shipment_width?: string;
  shipment_height?: string;
  shipment_length?: string;
  weight?: string;
  sequence?: number;
}

/**
 * Create a product AND keep the bidirectional Category.products[] in sync.
 * (No transaction — standalone Mongo in dev doesn't support them. If the product
 * is created but the back-ref write fails, we roll back the product manually.)
 */
export async function createProduct(input: CreateProductInput) {
  const category = await Category.findById(input.category);
  if (!category) throw ApiError.badRequest('Category does not exist');

  const product = await Product.create(input);
  try {
    await Category.updateOne(
      { _id: input.category },
      { $addToSet: { products: product._id } },
    );
  } catch (err) {
    await product.deleteOne().catch(() => undefined);
    throw err;
  }
  return product;
}

export async function updateProduct(id: string, patch: Partial<CreateProductInput>) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  // If the category changed, move the back-reference too.
  if (patch.category && patch.category !== product.category.toString()) {
    const newCat = await Category.findById(patch.category);
    if (!newCat) throw ApiError.badRequest('Category does not exist');
    await Category.updateOne({ _id: product.category }, { $pull: { products: product._id } });
    await Category.updateOne({ _id: patch.category }, { $addToSet: { products: product._id } });
  }

  Object.assign(product, patch);
  await product.save();
  return product;
}

export async function deleteProduct(id: string) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');
  await Category.updateOne({ _id: product.category }, { $pull: { products: product._id } });
  await product.deleteOne();
  return product;
}
