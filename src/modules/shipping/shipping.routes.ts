import { Router } from 'express';
import * as c from './shipping.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireStaff } from '../../middleware/auth';
import { orderIdParam, webhookSecretParam, webhookBodySchema } from './shipping.validation';

const router = Router();

// Public — see the comment on `webhook` in the controller for the secret gate.
router.post(
  '/webhook/:secret',
  validate({ params: webhookSecretParam, body: webhookBodySchema }),
  c.webhook,
);

router.post(
  '/:orderId/create',
  requireAuth,
  requireStaff,
  validate({ params: orderIdParam }),
  c.createShipment,
);
router.post(
  '/:orderId/sync',
  requireAuth,
  requireStaff,
  validate({ params: orderIdParam }),
  c.syncTracking,
);

export default router;
