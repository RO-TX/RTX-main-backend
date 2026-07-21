import type { Request, Response } from 'express';
import * as productService from './product.service';
import * as categoryService from './category.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok, created, paginated } from '../../lib/apiResponse';

/* ── Products ── */

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as productService.ListProductsParams;
  const { items, pagination } = await productService.listProducts(q);
  return paginated(res, items, pagination);
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductBySlug(req.params.slug);
  return ok(res, product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  return created(res, product, 'Product created');
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return ok(res, product, { message: 'Product updated' });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id);
  return ok(res, null, { message: 'Product deleted' });
});

/* ── Categories ── */

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const withProducts = (req.query as { withProducts?: boolean }).withProducts;
  const categories = await categoryService.listCategories({ withProducts });
  return ok(res, categories);
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getCategoryBySlug(req.params.slug);
  return ok(res, category);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  return created(res, category, 'Category created');
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return ok(res, category, { message: 'Category updated' });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const force = (req.query as { force?: boolean }).force ?? false;
  const result = await categoryService.deleteCategory(req.params.id, force);
  return ok(res, result, { message: 'Category deleted' });
});
