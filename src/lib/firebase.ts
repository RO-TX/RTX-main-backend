import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ApiError } from './ApiError';
import { env } from '../config/env';

/**
 * Firebase Admin, used for exactly one thing: proving that the ID token the
 * browser posted to `/auth/google` really was minted by Firebase for *our*
 * project. Nothing here trusts the client's claim about who they are — the
 * email and name below come out of a signature-checked token, not the body.
 *
 * Initialisation is lazy so a deployment with no Firebase configured still
 * boots; only `/auth/google` fails, and it fails with a clear 503 rather than
 * taking the process down at import time.
 *
 * Credentials, in order of preference:
 *   FIREBASE_SERVICE_ACCOUNT   the service-account JSON, inline
 *   GOOGLE_APPLICATION_CREDENTIALS  path to it (read by applicationDefault)
 *   FIREBASE_PROJECT_ID        project id alone — enough to verify ID tokens,
 *                              since the signing certificates are public
 */

let app: App | null = null;

function firebaseApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length) {
    app = existing[0]!;
    return app;
  }

  const raw = env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(raw) as Record<string, string>;
    } catch {
      throw ApiError.internal('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    }
    app = initializeApp({
      // Escaped newlines survive .env round-trips; real ones pass through.
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key?.replace(/\\n/g, '\n'),
      }),
      projectId: parsed.project_id,
    });
    return app;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    app = initializeApp({ credential: applicationDefault(), projectId: env.FIREBASE_PROJECT_ID });
    return app;
  }

  if (!env.FIREBASE_PROJECT_ID) {
    // 503, not 500: nothing is broken, the feature is simply switched off.
    throw new ApiError(
      503,
      'Google sign-in is not configured on this server (set FIREBASE_PROJECT_ID)',
    );
  }

  app = initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  return app;
}

export interface GoogleIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  picture?: string;
}

/**
 * Verify a Firebase ID token and reduce it to the fields an account needs.
 * `checkRevoked` is on: a session killed in the Firebase console should not
 * still be able to mint an RTX session minutes later.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  let decoded;
  try {
    decoded = await getAuth(firebaseApp()).verifyIdToken(idToken, true);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized('Google sign-in could not be verified. Please try again.');
  }

  if (!decoded.email) {
    throw ApiError.badRequest('That Google account has no email address attached.');
  }
  // Google's own provider always verifies the address; this rejects tokens
  // minted through some other provider on the same Firebase project.
  if (!decoded.email_verified) {
    throw ApiError.unauthorized('That Google account has an unverified email address.');
  }

  const full = (decoded.name as string | undefined)?.trim() ?? '';
  const [first = '', ...rest] = full.split(/\s+/);

  return {
    uid: decoded.uid,
    email: decoded.email.toLowerCase(),
    emailVerified: true,
    // Falling back to the local-part keeps `firstName` non-empty, which the
    // User schema requires — some Google accounts carry no display name.
    firstName: first || decoded.email.split('@')[0]!,
    lastName: rest.join(' '),
    picture: decoded.picture,
  };
}
