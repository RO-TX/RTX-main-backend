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
