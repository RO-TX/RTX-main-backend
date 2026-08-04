import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import catalogRoutes from '../modules/catalog/catalog.routes';
import ordersRoutes from '../modules/orders/orders.routes';
import contentRoutes from '../modules/content/content.routes';
import supportRoutes from '../modules/support/support.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import uploadsRoutes from '../modules/uploads/uploads.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import cartRoutes from '../modules/cart/cart.routes';
import addressesRoutes from '../modules/addresses/addresses.routes';
import shippingRoutes from '../modules/shipping/shipping.routes';

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
router.use('/notifications', notificationsRoutes);
router.use('/cart', cartRoutes); // guest-session or logged-in, see cart.controller
router.use('/addresses', addressesRoutes);
router.use('/shipping', shippingRoutes); // Delhivery — see shipping.controller for the webhook

/*
 * Still to build (needs a Razorpay account):
 *   router.use('/payments', paymentsRoutes);      // Razorpay
 */

export default router;
