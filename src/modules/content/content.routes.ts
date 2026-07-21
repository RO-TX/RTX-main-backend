import { Router } from 'express';
import * as c from './content.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import {
  idParam,
  createReviewSchema,
  updateReviewSchema,
  createCertificationSchema,
  updateCertificationSchema,
  certListQuery,
} from './content.validation';

const router = Router();

/* ── Reviews ── */
router.get('/reviews', c.listReviews); // public
router.post('/reviews', requireAuth, requireAdmin, validate({ body: createReviewSchema }), c.createReview);
router.patch(
  '/reviews/:id',
  requireAuth,
  requireAdmin,
  validate({ params: idParam, body: updateReviewSchema }),
  c.updateReview,
);
router.delete('/reviews/:id', requireAuth, requireAdmin, validate({ params: idParam }), c.deleteReview);

/* ── Certifications ── */
router.get('/certifications', validate({ query: certListQuery }), c.listCertifications); // public (activeOnly=true)
router.post(
  '/certifications',
  requireAuth,
  requireAdmin,
  validate({ body: createCertificationSchema }),
  c.createCertification,
);
router.patch(
  '/certifications/:id',
  requireAuth,
  requireAdmin,
  validate({ params: idParam, body: updateCertificationSchema }),
  c.updateCertification,
);
router.delete(
  '/certifications/:id',
  requireAuth,
  requireAdmin,
  validate({ params: idParam }),
  c.deactivateCertification,
);

export default router;
