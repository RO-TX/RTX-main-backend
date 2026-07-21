import { Router } from 'express';
import * as c from './catalog.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import {
  listProductsQuery,
  createProductSchema,
  updateProductSchema,
  slugParam,
  idParam,
  listCategoriesQuery,
  createCategorySchema,
  updateCategorySchema,
  deleteCategoryQuery,
} from './catalog.validation';

const router = Router();

/* ── Public catalog (read) ── */
router.get('/products', validate({ query: listProductsQuery }), c.listProducts);
router.get('/products/:slug', validate({ params: slugParam }), c.getProduct);
router.get('/categories', validate({ query: listCategoriesQuery }), c.listCategories);
router.get('/categories/:slug', validate({ params: slugParam }), c.getCategory);

/* ── Admin catalog (write) ── */
router.post(
  '/products',
  requireAuth,
  requireAdmin,
  validate({ body: createProductSchema }),
  c.createProduct,
);
router.patch(
  '/products/:id',
  requireAuth,
  requireAdmin,
  validate({ params: idParam, body: updateProductSchema }),
  c.updateProduct,
);
router.delete(
  '/products/:id',
  requireAuth,
  requireAdmin,
  validate({ params: idParam }),
  c.deleteProduct,
);

router.post(
  '/categories',
  requireAuth,
  requireAdmin,
  validate({ body: createCategorySchema }),
  c.createCategory,
);
router.patch(
  '/categories/:id',
  requireAuth,
  requireAdmin,
  validate({ params: idParam, body: updateCategorySchema }),
  c.updateCategory,
);
router.delete(
  '/categories/:id',
  requireAuth,
  requireAdmin,
  validate({ params: idParam, query: deleteCategoryQuery }),
  c.deleteCategory,
);

export default router;
