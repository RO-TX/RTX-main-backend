import { Router } from 'express';
import * as c from './addresses.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { idParam, createAddressSchema, updateAddressSchema } from './addresses.validation';

const router = Router();

// Self-service, own record only — matches /auth/profile, /auth/password.
router.use(requireAuth);

router.get('/', c.list);
router.post('/', validate({ body: createAddressSchema }), c.create);
router.patch('/:id', validate({ params: idParam, body: updateAddressSchema }), c.update);
router.delete('/:id', validate({ params: idParam }), c.remove);
router.patch('/:id/default', validate({ params: idParam }), c.setDefault);

export default router;
