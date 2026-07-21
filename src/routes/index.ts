import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import catalogRoutes from '../modules/catalog/catalog.routes';
import ordersRoutes from '../modules/orders/orders.routes';
import contentRoutes from '../modules/content/content.routes';
import supportRoutes from '../modules/support/support.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import uploadsRoutes from '../modules/uploads/uploads.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/catalog', catalogRoutes);
router.use('/orders', ordersRoutes);
router.use('/content', contentRoutes); // reviews + certifications
router.use('/support', supportRoutes); // repair + AMC
router.use('/analytics', analyticsRoutes);
router.use('/uploads', uploadsRoutes); // S3-backed image uploads

/*
 * Still to build (need external API keys / customer flows):
 *   router.use('/cart', cartRoutes);
 *   router.use('/payments', paymentsRoutes);      // Razorpay
 *   router.use('/shipping', shippingRoutes);      // Delhivery
 *   router.use('/warehouses', warehouseRoutes);
 */

export default router;
