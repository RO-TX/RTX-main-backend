import { Router } from 'express';
import * as c from './orders.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireStaff } from '../../middleware/auth';
import {
  listOrdersQuery,
  idParam,
  updateStatusSchema,
  placeOrderSchema,
  myOrdersQuery,
} from './orders.validation';

const router = Router();

// Customer routes (own orders). Defined before /:id so "mine" isn't treated as an id.
router.get('/mine', requireAuth, validate({ query: myOrdersQuery }), c.myOrders);
router.post('/', requireAuth, validate({ body: placeOrderSchema }), c.place);

// Admin routes
router.get('/', requireAuth, requireStaff, validate({ query: listOrdersQuery }), c.list);
router.get('/:id', requireAuth, requireStaff, validate({ params: idParam }), c.getOne);
router.patch(
  '/:id/status',
  requireAuth,
  requireStaff,
  validate({ params: idParam, body: updateStatusSchema }),
  c.updateStatus,
);

export default router;
