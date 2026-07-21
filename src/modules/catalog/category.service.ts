import { Category, Product } from '../../models';
import { ApiError } from '../../lib/ApiError';

export async function listCategories(opts: { withProducts?: boolean } = {}) {
  const query = Category.find().sort({ createdAt: -1 });
  if (opts.withProducts) {
    query.populate({ path: 'products', match: { isActive: true }, options: { sort: { sequence: 1 } } });
  }
  return query.exec();
}

export async function getCategoryBySlug(slug: string) {
  const category = await Category.findOne({ slug }).populate({
    path: 'products',
    match: { isActive: true },
    options: { sort: { sequence: 1 } },
  });
  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

export interface CreateCategoryInput {
  name: string;
  catImage: string;
  description?: string;
  categoryType?: 'customplushome' | 'customcategory' | 'homecategory';
}

export async function createCategory(input: CreateCategoryInput) {
  return Category.create(input);
}

export async function updateCategory(id: string, patch: Partial<CreateCategoryInput>) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found');
  Object.assign(category, patch);
  await category.save(); // triggers slug regeneration hook when name changes
  return category;
}

/**
 * Deletes a category. Unlike the old site (whose DELETE cascade-deleted every
 * product in the category, with no auth), this refuses to delete a non-empty
 * category unless `force` is set — preventing accidental catalog wipes.
 */
export async function deleteCategory(id: string, force = false) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found');

  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0 && !force) {
    throw ApiError.conflict(
      `Category has ${productCount} product(s). Reassign or delete them first, or pass force=true.`,
    );
  }
  if (force) {
    await Product.deleteMany({ category: id });
  }
  await category.deleteOne();
  return { deletedProducts: force ? productCount : 0 };
}
