import crypto from 'crypto';
import { User, Otp, ResetToken, RefreshToken, LoginLog, type IUser } from '../../models';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  newTokenId,
  hashToken,
  type Role,
} from '../../lib/jwt';
import { sendMail, otpEmail, resetEmail } from '../../lib/mailer';
import { ApiError } from '../../lib/ApiError';
import { env } from '../../config/env';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

function sixDigitCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function sanitize(user: IUser) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mobile: user.mobile,
    image: user.image,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

/** Mint an access+refresh pair and persist the (hashed) refresh token. */
async function issueTokens(user: IUser, meta: RequestMeta): Promise<IssuedTokens> {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role as Role,
    email: user.email,
  });

  const jti = newTokenId();
  const refreshToken = signRefreshToken({ sub: user._id.toString(), jti });

  await RefreshToken.create({
    user: user._id,
    jti,
    tokenHash: hashToken(refreshToken),
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  return { accessToken, refreshToken };
}

/* ─────────────── Signup (OTP-first; no user until verified) ─────────────── */

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  password: string;
}

/** Step 1: validate email is free, generate + email an OTP. No user created yet. */
export async function requestSignupOtp(email: string): Promise<void> {
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const code = sixDigitCode();
  const codeHash = await hashPassword(code);

  // One active OTP per email/purpose — replace any prior one.
  await Otp.deleteMany({ email, purpose: 'signup' });
  await Otp.create({
    email,
    codeHash,
    purpose: 'signup',
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendMail({ to: email, ...otpEmail(code) });
}

/** Step 2: verify the OTP, then create the user and issue tokens. */
export async function verifyOtpAndRegister(
  input: SignupInput,
  code: string,
  meta: RequestMeta,
): Promise<{ user: ReturnType<typeof sanitize>; tokens: IssuedTokens }> {
  const otp = await Otp.findOne({ email: input.email, purpose: 'signup' });
  if (!otp) {
    throw ApiError.badRequest('No verification code found. Please request a new one.');
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    await otp.deleteOne();
    throw ApiError.badRequest('Verification code expired. Please request a new one.');
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await otp.deleteOne();
    throw ApiError.tooMany('Too many incorrect attempts. Please request a new code.');
  }

  const valid = await verifyPassword(code, otp.codeHash);
  if (!valid) {
    otp.attempts += 1;
    await otp.save();
    throw ApiError.badRequest('Invalid verification code');
  }

  // Re-check uniqueness in case of a race between request and verify.
  const existing = await User.findOne({ email: input.email }).lean();
  if (existing) {
    await otp.deleteOne();
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    mobile: input.mobile ?? '',
    password: await hashPassword(input.password),
    role: 'customer', // role is always forced; never trust client input
    emailVerified: true,
  });

  await otp.deleteOne();
  const tokens = await issueTokens(user, meta);
  return { user: sanitize(user), tokens };
}

/* ─────────────── Login ─────────────── */

export async function login(
  email: string,
  password: string,
  meta: RequestMeta,
): Promise<{ user: ReturnType<typeof sanitize>; tokens: IssuedTokens }> {
  const user = await User.findOne({ email });
  const valid = user && (await verifyPassword(password, user.password));

  if (!valid) {
    await LoginLog.create({
      user: user?._id,
      email,
      success: false,
      reason: 'invalid_credentials',
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    // Generic message avoids account enumeration (old site leaked "user not found").
    throw ApiError.unauthorized('Invalid email or password');
  }

  await LoginLog.create({
    user: user._id,
    email,
    success: true,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  const tokens = await issueTokens(user, meta);
  return { user: sanitize(user), tokens };
}

/* ─────────────── Refresh (with rotation) ─────────────── */

export async function refresh(
  rawToken: string,
  meta: RequestMeta,
): Promise<{ user: ReturnType<typeof sanitize>; tokens: IssuedTokens }> {
  let payload: { sub: string; jti: string };
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const stored = await RefreshToken.findOne({ jti: payload.jti });
  if (!stored || stored.revokedAt || stored.tokenHash !== hashToken(rawToken)) {
    // Reuse of a rotated/revoked token → revoke the whole family defensively.
    if (stored?.user) {
      await RefreshToken.updateMany(
        { user: stored.user, revokedAt: { $exists: false } },
        { revokedAt: new Date() },
      );
    }
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  // Rotate: revoke the old token, issue a fresh pair.
  const tokens = await issueTokens(user, meta);
  stored.revokedAt = new Date();
  await stored.save();

  return { user: sanitize(user), tokens };
}

/* ─────────────── Logout ─────────────── */

export async function logout(rawToken?: string): Promise<void> {
  if (!rawToken) return;
  try {
    const { jti } = verifyRefreshToken(rawToken);
    await RefreshToken.updateOne({ jti }, { revokedAt: new Date() });
  } catch {
    /* already invalid — nothing to revoke */
  }
}

export async function logoutAll(userId: string): Promise<void> {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  );
}

/* ─────────────── Password reset ─────────────── */

export async function requestPasswordReset(email: string, resetBaseUrl: string): Promise<void> {
  const user = await User.findOne({ email }).lean();
  // Always return success to the caller (no enumeration); only email if real.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  await ResetToken.deleteMany({ email });
  await ResetToken.create({
    email,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  const link = `${resetBaseUrl}?token=${rawToken}&email=${encodeURIComponent(email)}`;
  await sendMail({ to: email, ...resetEmail(link) });
}

export async function resetPassword(
  email: string,
  rawToken: string,
  newPassword: string,
): Promise<void> {
  const record = await ResetToken.findOne({ email, tokenHash: hashToken(rawToken) });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  const user = await User.findOne({ email });
  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');

  user.password = await hashPassword(newPassword);
  await user.save();

  record.usedAt = new Date();
  await record.save();

  // Security: invalidate all sessions after a password reset.
  await logoutAll(user._id.toString());
}

/* ─────────────── Authed account ops ─────────────── */

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return sanitize(user);
}

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (!(await verifyPassword(currentPassword, user.password))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = await hashPassword(newPassword);
  await user.save();
  await logoutAll(userId); // force re-login everywhere
}

export interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  mobile?: string;
  image?: string;
}

/**
 * Updates the CALLER'S OWN profile only. The user id comes from the verified
 * token, never the request body — this closes the old site's IDOR hole where
 * anyone could edit any account by passing an email.
 */
export async function updateProfile(userId: string, patch: ProfileUpdate) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: patch },
    { new: true, runValidators: true },
  );
  if (!user) throw ApiError.notFound('User not found');
  return sanitize(user);
}

export async function deleteAccount(userId: string, password: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  // OAuth-only users (no password) skip the password check.
  if (user.password && !(await verifyPassword(password, user.password))) {
    throw ApiError.badRequest('Password is incorrect');
  }
  await RefreshToken.deleteMany({ user: userId });
  await user.deleteOne();
}

export { sanitize };

/* ─────────────── Login log (audit) ─────────────── */

export interface ListLoginLogsParams {
  page: number;
  limit: number;
  success?: boolean;
  email?: string;
}

export async function listLoginLogs(params: ListLoginLogsParams) {
  const { page, limit, success, email } = params;
  const filter: Record<string, unknown> = {};
  if (success !== undefined) filter.success = success;
  if (email) filter.email = { $regex: email, $options: 'i' };

  const [items, total] = await Promise.all([
    LoginLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'firstName lastName email role'),
    LoginLog.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Frontend URL used to build the reset link. */
export function defaultResetBaseUrl(): string {
  const firstOrigin = env.CORS_ORIGINS.split(',')[0]?.trim() || 'http://localhost:3000';
  return `${firstOrigin}/reset-password`;
}
