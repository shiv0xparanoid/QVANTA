import express, { Router } from 'express';
import { z } from 'zod';
import { JwtAuthGuard, type AuthRequest } from '../auth/auth.middleware';
import {
  createCheckoutSession,
  createBillingPortalSession,
  handleWebhook,
  getPublicTiers,
} from './billing.service';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';

export const billingRouter = Router();

const checkoutSchema = z.object({
  tier: z.enum(['pro', 'free']),
});

billingRouter.get('/tiers', (_req, res) => {
  res.status(200).json(getPublicTiers());
});

billingRouter.post('/checkout', JwtAuthGuard, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid input', parsed.error.flatten());
    }

    const result = await createCheckoutSession(authReq.user, parsed.data.tier);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

billingRouter.get('/portal', JwtAuthGuard, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const result = await createBillingPortalSession(user.stripeCustomerId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

billingRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const signature = req.headers['stripe-signature'];
      const rawBody = req.body;

      const buf = Buffer.isBuffer(rawBody)
        ? rawBody
        : typeof rawBody === 'string'
          ? Buffer.from(rawBody)
          : Buffer.from(JSON.stringify(rawBody));

      await handleWebhook(buf, signature);
      res.status(200).json({ received: true });
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 400) {
        return res.status(400).json({
          error: {
            code: err.code,
            message: err.message,
          },
        });
      }
      next(err);
    }
  }
);
