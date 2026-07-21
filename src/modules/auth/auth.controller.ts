import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok, created, paginated } from '../../lib/apiResponse';
import { ApiError } from '../../lib/ApiError';
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } from '../../lib/cookies';

function meta(req: Request): authService.RequestMeta {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

function readRefreshCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
}

/** POST /auth/request-otp — step 1 of signup. */
export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  await authService.requestSignupOtp(req.body.email);
  return ok(res, null, { message: 'Verification code sent to your email' });
});

/** POST /auth/signup — step 2: verify OTP + create account. */
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { code, ...input } = req.body;
  const { user, tokens } = await authService.verifyOtpAndRegister(input, code, meta(req));
  setRefreshCookie(res, tokens.refreshToken);
  return created(res, { user, accessToken: tokens.accessToken }, 'Account created');
});

/** POST /auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, tokens } = await authService.login(email, password, meta(req));
  setRefreshCookie(res, tokens.refreshToken);
  return ok(res, { user, accessToken: tokens.accessToken }, { message: 'Logged in' });
});

/** POST /auth/refresh — rotate tokens. */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const raw = readRefreshCookie(req);
  if (!raw) throw ApiError.unauthorized('No refresh token');
  const { user, tokens } = await authService.refresh(raw, meta(req));
  setRefreshCookie(res, tokens.refreshToken);
  return ok(res, { user, accessToken: tokens.accessToken });
});

/** POST /auth/logout */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(readRefreshCookie(req));
  clearRefreshCookie(res);
  return ok(res, null, { message: 'Logged out' });
});

/** POST /auth/logout-all — revoke every session for the current user. */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.user!.id);
  clearRefreshCookie(res);
  return ok(res, null, { message: 'Logged out of all devices' });
});

/** GET /auth/me */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  return ok(res, user);
});

/** POST /auth/forgot-password */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.requestPasswordReset(req.body.email, authService.defaultResetBaseUrl());
  return ok(res, null, {
    message: 'If an account exists for that email, a reset link has been sent',
  });
});

/** POST /auth/reset-password */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, token, password } = req.body;
  await authService.resetPassword(email, token, password);
  return ok(res, null, { message: 'Password reset successful. Please log in.' });
});

/** PATCH /auth/password (authed) */
export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await authService.updatePassword(req.user!.id, currentPassword, newPassword);
  clearRefreshCookie(res);
  return ok(res, null, { message: 'Password updated. Please log in again.' });
});

/** PATCH /auth/profile (authed) — own profile only. */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.id, req.body);
  return ok(res, user, { message: 'Profile updated' });
});

/** DELETE /auth/account (authed) */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  await authService.deleteAccount(req.user!.id, req.body.password ?? '');
  clearRefreshCookie(res);
  return ok(res, null, { message: 'Account deleted' });
});

/** GET /auth/login-logs (admin only) */
export const listLoginLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, success, email } = req.query as unknown as {
    page: number;
    limit: number;
    success?: boolean;
    email?: string;
  };
  const { items, pagination } = await authService.listLoginLogs({ page, limit, success, email });
  return paginated(res, items, pagination);
});
