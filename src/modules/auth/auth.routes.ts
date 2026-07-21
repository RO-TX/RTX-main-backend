import { Router } from 'express';
import * as c from './auth.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import {
  requestOtpSchema,
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  updateProfileSchema,
  deleteAccountSchema,
  listLoginLogsQuery,
} from './auth.validation';

const router = Router();

// Public, rate-limited
router.post('/request-otp', authLimiter, validate({ body: requestOtpSchema }), c.requestOtp);
router.post('/signup', authLimiter, validate({ body: signupSchema }), c.signup);
router.post('/login', authLimiter, validate({ body: loginSchema }), c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  c.forgotPassword,
);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), c.resetPassword);

// Authenticated
router.get('/me', requireAuth, c.me);
router.post('/logout-all', requireAuth, c.logoutAll);
router.patch('/password', requireAuth, validate({ body: updatePasswordSchema }), c.updatePassword);
router.patch('/profile', requireAuth, validate({ body: updateProfileSchema }), c.updateProfile);
router.delete('/account', requireAuth, validate({ body: deleteAccountSchema }), c.deleteAccount);
router.get(
  '/login-logs',
  requireAuth,
  requireAdmin,
  validate({ query: listLoginLogsQuery }),
  c.listLoginLogs,
);

export default router;
