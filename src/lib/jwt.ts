import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export type Role = 'customer' | 'call_center' | 'microadmin' | 'admin';

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string; // token id — lets us revoke a specific refresh token
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/** Random opaque id used as the refresh token's jti. */
export function newTokenId(): string {
  return crypto.randomUUID();
}

/** SHA-256 hash for at-rest storage of refresh tokens (never store raw). */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
