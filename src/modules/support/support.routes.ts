import { Router } from 'express';
import * as c from './support.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireStaff } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import {
  idParam,
  createRepairSchema,
  listRepairQuery,
  updateRepairSchema,
  createAmcSchema,
  listAmcQuery,
  updateAmcSchema,
} from './support.validation';

const router = Router();

/* ── Repair requests ── */
router.post('/repair-requests', authLimiter, validate({ body: createRepairSchema }), c.createRepair); // public
router.get(
  '/repair-requests',
  requireAuth,
  requireStaff,
  validate({ query: listRepairQuery }),
  c.listRepair,
);
router.patch(
  '/repair-requests/:id',
  requireAuth,
  requireStaff,
  validate({ params: idParam, body: updateRepairSchema }),
  c.updateRepair,
);

/* ── AMC enquiries ── */
router.post('/amc-enquiries', authLimiter, validate({ body: createAmcSchema }), c.createAmc); // public
router.get(
  '/amc-enquiries',
  requireAuth,
  requireStaff,
  validate({ query: listAmcQuery }),
  c.listAmc,
);
router.patch(
  '/amc-enquiries/:id',
  requireAuth,
  requireStaff,
  validate({ params: idParam, body: updateAmcSchema }),
  c.updateAmc,
);
router.delete(
  '/amc-enquiries/:id',
  requireAuth,
  requireStaff,
  validate({ params: idParam }),
  c.deleteAmc,
);

export default router;
