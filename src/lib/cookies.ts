import type { Response } from 'express';
import { env, isProd } from '../config/env';

export const REFRESH_COOKIE = 'refreshToken';

/** ms helpers for cookie maxAge derived from the configured refresh lifetime. */
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (matches JWT_REFRESH_EXPIRES default)

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // cross-subdomain (app./admin.) in prod
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  });
}
