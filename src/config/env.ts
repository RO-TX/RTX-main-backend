import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Validated, typed environment config. The app refuses to boot if a required
 * variable is missing or malformed — this is intentional. (The old site read
 * env vars ad-hoc and silently misbehaved when they were absent.)
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  // Stored for future use (cloud DB). Not used unless copied into MONGODB_URI.
  MONGODB_ATLAS_URI: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be set (>=16 chars)'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be set (>=16 chars)'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().optional(),

  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_AUTH: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('RO Technical Xperts <no-reply@rotechnicalxperts.com>'),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('rtx'),

  DELHIVERY_API_KEY: z.string().optional(),
  DELHIVERY_ENVIRONMENT: z.enum(['staging', 'production']).default('staging'),
  MOCK_SHIPPING_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  // Pickup location name + client name exactly as registered in the Delhivery
  // dashboard — the manifest API rejects anything that doesn't match verbatim.
  DELHIVERY_PICKUP_LOCATION: z.string().optional(),
  DELHIVERY_CLIENT_NAME: z.string().optional(),
  DELHIVERY_SELLER_GST_TIN: z.string().optional(),
  DELHIVERY_HSN_CODE: z.string().optional(),
  DELHIVERY_DEFAULT_WEIGHT_GRAMS: z.string().default('3000'),
  // Forms part of the webhook URL path — Delhivery's push API has no
  // documented signature scheme, so this is the endpoint's only gate.
  DELHIVERY_WEBHOOK_SECRET: z.string().optional(),

  // Firebase — only /auth/google needs these. The project id alone is enough
  // to verify ID tokens (the signing certificates are public); a full service
  // account is accepted too, inline as JSON.
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),

  GROQ_API_KEY: z.string().optional(),

  // AWS S3 (file/image storage) — future use. All optional for now.
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  COMPANY_NAME: z.string().default('RO Technical Xperts'),
  SUPPORT_PHONE: z.string().default('+91-8810294546'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

/**
 * Allowed CORS origins as an array.
 *
 * Trailing slashes are stripped: it's natural to paste "https://site.com/" into
 * a host's env var, but the browser's `Origin` header never carries one, so the
 * allowlist entry would silently never match and every request would fail CORS.
 */
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
