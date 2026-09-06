import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';
import { getTierByName, FREE, PRO } from '../../lib/billing/tiers';
import type { JwtPayload } from '../../lib/jwt';
import type { UserTier } from '@qvanta/types';

let stripeInstance: Stripe | null = null;

export function initStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw AppError.internal('STRIPE_SECRET_KEY is not configured');
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  });

  return stripeInstance;
}

export async function createCheckoutSession(
  user: JwtPayload,
  tierName: 'pro' | 'free'
): Promise<{ checkoutUrl: string }> {
  const stripe = initStripe();
  const tier = getTierByName(tierName);

  if (tierName === 'free') {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      throw AppError.notFound('User not found');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { tier: 'free' },
    });
    return { checkoutUrl: `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/settings/billing?tier=free` };
  }

  if (!tier.stripePriceId) {
    throw AppError.internal('Stripe price ID is not configured for this tier');
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    throw AppError.notFound('User not found');
  }

  const customerParams: { customer: string } | { customer_email: string } =
    dbUser.stripeCustomerId
      ? { customer: dbUser.stripeCustomerId }
      : { customer_email: dbUser.email };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    ...customerParams,
    line_items: [
      {
        price: tier.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/settings/billing?canceled=true`,
    client_reference_id: dbUser.id,
    metadata: {
      userId: dbUser.id,
      tier: tierName,
    },
  });

  if (!session.url) {
    throw AppError.internal('Failed to create Stripe checkout session URL');
  }

  logger.info(`Checkout session created for user ${user.id}: ${session.id}`);

  return { checkoutUrl: session.url };
}

export async function createBillingPortalSession(
  stripeCustomerId: string | null | undefined
): Promise<{ portalUrl: string }> {
  const stripe = initStripe();

  if (!stripeCustomerId) {
    throw AppError.badRequest('No active subscription found. Please subscribe first.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/settings/billing`,
  });

  return { portalUrl: session.url };
}

async function logSubscriptionEvent(
  userId: string,
  stripeEventId: string,
  type: string,
  payload: unknown
): Promise<void> {
  try {
    await prisma.subscriptionEvent.create({
      data: {
        userId,
        stripeEventId,
        type,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2002') {
      logger.warn(`Duplicate subscription event ignored: ${stripeEventId}`);
    } else {
      logger.error(`Failed to log subscription event ${stripeEventId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function findUserByStripeCustomer(customerId: string): Promise<{ id: string } | null> {
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user;
}

async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return user;
}

async function upsertUserToPro(input: { stripeCustomerId: string; email?: string }): Promise<{ userId: string } | null> {
  if (input.email) {
    const user = await prisma.user.upsert({
      where: { email: input.email.toLowerCase() },
      update: {
        stripeCustomerId: input.stripeCustomerId,
        tier: 'pro',
      },
      create: {
        email: input.email.toLowerCase(),
        stripeCustomerId: input.stripeCustomerId,
        tier: 'pro',
      },
      select: { id: true },
    });
    return { userId: user.id };
  }

  const user = await prisma.user.update({
    where: { stripeCustomerId: input.stripeCustomerId },
    data: { tier: 'pro' },
    select: { id: true },
  });
  return { userId: user.id };
}

export async function handleWebhook(
  rawBody: Buffer | string,
  signature: string | string[] | undefined
): Promise<Stripe.Event> {
  const stripe = initStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw AppError.internal('STRIPE_WEBHOOK_SECRET is not configured');
  }

  if (!signature) {
    throw AppError.badRequest('Missing Stripe signature header');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature as string,
      webhookSecret
    );
  } catch (err) {
    logger.warn(`Stripe webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
    throw AppError.badRequest('Invalid Stripe webhook signature');
  }

  logger.info(`Received Stripe webhook event: ${event.type} (${event.id})`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const customerEmail = session.customer_email ?? undefined;
      const metadataUserId = session.metadata?.userId;

      let userId: string | null = metadataUserId ?? null;

      if (!userId && customerId) {
        const u = await findUserByStripeCustomer(customerId);
        if (u) userId = u.id;
      }

      if (!userId && customerEmail) {
        const u = await findUserByEmail(customerEmail);
        if (u) userId = u.id;
      }

      if (userId && customerId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: customerId,
            tier: 'pro',
          },
        }).catch(async () => {
          if (customerEmail) {
            await upsertUserToPro({ stripeCustomerId: customerId, email: customerEmail });
          }
        });
        await logSubscriptionEvent(userId, event.id, event.type, event.data.object);
        logger.info(`Checkout completed: user ${userId} upgraded to pro`);
      } else if (customerEmail && customerId) {
        const result = await upsertUserToPro({ stripeCustomerId: customerId, email: customerEmail });
        if (result) {
          await logSubscriptionEvent(result.userId, event.id, event.type, event.data.object);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

      if (!customerId) break;

      const user = await findUserByStripeCustomer(customerId);
      if (!user) break;

      const status = subscription.status;
      let newTier: UserTier;

      if (status === 'active' || status === 'trialing') {
        newTier = 'pro';
      } else if (status === 'canceled' || status === 'past_due' || status === 'unpaid' || status === 'incomplete_expired') {
        newTier = 'free';
      } else {
        newTier = 'free';
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { tier: newTier },
      });

      await logSubscriptionEvent(user.id, event.id, event.type, {
        status,
        newTier,
        raw: subscription,
      });

      logger.info(`Subscription updated: user ${user.id} tier set to ${newTier} (status=${status})`);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

      if (!customerId) break;

      const user = await findUserByStripeCustomer(customerId);
      if (!user) break;

      await prisma.user.update({
        where: { id: user.id },
        data: { tier: 'free' },
      });

      await logSubscriptionEvent(user.id, event.id, event.type, event.data.object);
      logger.info(`Subscription deleted: user ${user.id} tier set to free`);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

      if (customerId) {
        const user = await findUserByStripeCustomer(customerId);
        if (user) {
          await logSubscriptionEvent(user.id, event.id, event.type, event.data.object);
          logger.info(`Invoice paid for user ${user.id}: ${invoice.id}`);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

      if (customerId) {
        const user = await findUserByStripeCustomer(customerId);
        if (user) {
          await logSubscriptionEvent(user.id, event.id, event.type, event.data.object);
          logger.warn(`Invoice payment failed for user ${user.id}: ${invoice.id}`);
        }
      }
      break;
    }

    default: {
      const obj = event.data.object as { customer?: string | { id: string } };
      const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
      if (customerId) {
        const user = await findUserByStripeCustomer(customerId);
        if (user) {
          await logSubscriptionEvent(user.id, event.id, event.type, event.data.object);
        }
      }
      logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  return event;
}

export function getPublicTiers() {
  return [FREE, PRO];
}
