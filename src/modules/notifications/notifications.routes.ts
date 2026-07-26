import { Router } from 'express';
import * as c from './notifications.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireStaff } from '../../middleware/auth';
import { idParam, listNotificationsQuery } from './notifications.validation';

const router = Router();

router.get('/', requireAuth, requireStaff, validate({ query: listNotificationsQuery }), c.list);
router.patch('/:id/read', requireAuth, requireStaff, validate({ params: idParam }), c.markRead);
router.post('/read-all', requireAuth, requireStaff, c.markAllRead);

export default router;
