import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { isDev } from './config/env';
import { apiLimiter } from './middleware/rateLimit';
import { notFoundHandler, errorHandler } from './middleware/error';
import apiRoutes from './routes';

export function createApp(): Application {
  const app = express();

  // Behind a proxy (nginx / load balancer) — needed for correct req.ip + secure cookies.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      // Allow all origins. Reflecting the request origin (instead of a literal
      // "*") is required because credentials:true forbids a wildcard value.
      origin(origin, callback) {
        callback(null, origin ?? true);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (isDev) app.use(morgan('dev'));

  app.use('/api', apiLimiter, apiRoutes);

  // Root ping
  app.get('/', (_req, res) => {
    res.json({ success: true, service: 'rtx-main-backend', docs: '/api/health' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
