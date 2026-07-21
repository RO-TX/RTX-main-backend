import { Router } from 'express';
import * as c from './users.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import {
  listUsersQuery,
  userIdParam,
  updateRoleSchema,
  createUserSchema,
} from './users.validation';

const router = Router();

// User/customer management is ADMIN only (microadmin/call center have no access).
router.use(requireAuth);

router.get('/', requireAdmin, validate({ query: listUsersQuery }), c.list);
router.get('/:id', requireAdmin, validate({ params: userIdParam }), c.getOne);

// Create a staff account (call_center / microadmin / admin) — admin only.
router.post('/', requireAdmin, validate({ body: createUserSchema }), c.create);

// Role changes and deletion → admin only.
router.patch(
  '/:id/role',
  requireAdmin,
  validate({ params: userIdParam, body: updateRoleSchema }),
  c.updateRole,
);
router.delete('/:id', requireAdmin, validate({ params: userIdParam }), c.remove);

export default router;
