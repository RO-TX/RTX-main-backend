import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../lib/logger';

/**
 * Cached Mongoose connection.
 *
 * Fixes three problems from the old site's dbConnect:
 *   1. It read `PROJECT_URL` instead of a standard name  → we use MONGODB_URI.
 *   2. No connection caching (a new connection per call) → we cache + reuse.
 *   3. `process.exit(1)` on failure                      → we throw and let the
 *      caller decide; the server bootstrap handles ret/exit centrally.
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  mongoose.set('strictQuery', true);

  connectionPromise = mongoose
    .connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    })
    .then((m) => {
      logger.info(`MongoDB connected: ${m.connection.host}/${m.connection.name}`);
      return m;
    })
    .catch((err) => {
      connectionPromise = null; // allow a retry on the next call
      throw err;
    });

  return connectionPromise;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectionPromise = null;
    logger.info('MongoDB disconnected');
  }
}

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', err);
});
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});
