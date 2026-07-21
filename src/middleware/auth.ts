import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type Role } from '../lib/jwt';
import { ApiError } from '../lib/ApiError';

/** Role hierarchy — a higher level satisfies any requirement at or below it. */
const ROLE_RANK: Record<Role, number> = {
  customer: 1,
  call_center: 2,
  microadmin: 3,
  admin: 4,
};

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  // Fallback: access token in cookie (useful for same-site dashboard calls)
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.accessToken;
  return cookieToken ?? null;
}

/**
 * Requires a valid access token. Attaches `req.user`. The role carried in the
 * token is authoritative for routing, but it was minted from the DB at login —
 * privileged mutations should still re-check the DB where it matters.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch (err) {
    next(err); // TokenExpired / JsonWebTokenError → handled centrally as 401
  }
}

/**
 * Requires one of the given roles (or higher in the hierarchy).
 *
 * Fixes the old site's `requireMicroAdmin`, which only blocked a non-existent
 * "user" role and let customers straight through. Here, requireRole('microadmin')
 * admits microadmin AND admin, but NOT customer.
 */
export function requireRole(...allowed: Role[]) {
  const minRank = Math.min(...allowed.map((r) => ROLE_RANK[r]));
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (ROLE_RANK[req.user.role] < minRank) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireMicroAdmin = requireRole('microadmin'); // admits microadmin + admin
export const requireStaff = requireRole('call_center'); // any staff: call_center + microadmin + admin

/**
 * Optional auth — attaches req.user if a valid token is present, but never
 * blocks. Useful for endpoints that personalise output when logged in
 * (e.g. cart activity) yet still serve anonymous visitors.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    /* ignore invalid token for optional auth */
  }
  next();
}
