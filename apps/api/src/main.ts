import 'dotenv/config';
import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { logger } from './lib/logger';
import { AppError } from './lib/errors';

import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { billingRouter } from './modules/billing/billing.router';
import { adminRouter } from './modules/admin/admin.router';
import { circuitsRouter } from './modules/circuits/circuits.router';
import { tutorRouter } from './modules/tutor/tutor.router';
import { healthRouter } from './modules/health/health.router';
import { simulationsRouter } from './modules/simulations/simulations.router';
import { lessonsRouter } from './modules/lessons/lessons.router';

import { seedAdminUser } from './seeders/admin';

function createApp(): Express {
  const app = express();

  app.use(helmet());

  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  app.use(
    cors({
      origin: webOrigin,
      credentials: true,
    })
  );

  app.use(cookieParser());

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/billing/webhook') {
      express.raw({ type: 'application/json' })(req, res, next);
    } else {
      express.json({ limit: '10mb' })(req, res, next);
    }
  });

  app.use(passport.initialize());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.http(`${req.method} ${req.path}`);
    next();
  });

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/billing', billingRouter);
  app.use('/admin', adminRouter);
  app.use('/circuits', circuitsRouter);
  app.use('/tutor', tutorRouter);
  app.use('/simulations', simulationsRouter);
  app.use('/lessons', lessonsRouter);
  app.use('/health', healthRouter);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(AppError.notFound('Route not found'));
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      logger.warn(`AppError [${err.code}]: ${err.message}`);
      return res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      });
    }

    if (err instanceof SyntaxError && 'body' in err && err.message.includes('JSON')) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid JSON payload',
        },
      });
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`Unhandled error: ${message}`);
    if (err instanceof Error && err.stack) {
      logger.debug(err.stack);
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });

  return app;
}

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000);
  const app = createApp();

  try {
    await seedAdminUser();
  } catch (err) {
    logger.warn(`Admin seeding failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  app.listen(port, () => {
    logger.info(`Qvanta API server listening on port ${port}`);
    logger.info(`WEB_ORIGIN: ${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}`);
  });
}

bootstrap().catch((err) => {
  logger.error(`Failed to bootstrap API: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
