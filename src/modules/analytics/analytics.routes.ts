import { Router } from 'express';
import * as c from './analytics.controller';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

// Dashboard analytics (revenue etc.) — ADMIN only. Microadmin/call center
// don't see money.
router.use(requireAuth, requireAdmin);

router.get('/overview', c.overview);
router.get('/revenue-series', c.revenueSeries);
router.get('/recent-orders', c.recentOrders);

export default router;
