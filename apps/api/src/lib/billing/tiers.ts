import type { SubscriptionTier, UserTier } from '@qvanta/types';

export const FREE: SubscriptionTier & { tier: 'free' } = {
  tier: 'free',
  name: 'Free',
  description: 'Get started with quantum circuit simulations. Perfect for students and hobbyists.',
  simsPerMonth: 50,
  maxShots: 1024,
  stripePriceId: process.env.STRIPE_PRICE_FREE_ID,
};

export const PRO: SubscriptionTier & { tier: 'pro' } = {
  tier: 'pro',
  name: 'Pro',
  description: 'Unlimited simulations with high shot counts. For researchers and power users.',
  simsPerMonth: 999999,
  maxShots: 65536,
  stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY_ID,
};

export const TIERS: Array<SubscriptionTier & { tier: UserTier }> = [FREE, PRO];

export function getTierByName(tier: UserTier): SubscriptionTier & { tier: UserTier } {
  const found = TIERS.find((t) => t.tier === tier);
  if (found) return found;
  return FREE;
}

export function getTierLimits(tier: UserTier): { simsPerMonth: number; maxShots: number } {
  const t = getTierByName(tier);
  return {
    simsPerMonth: t.simsPerMonth,
    maxShots: t.maxShots,
  };
}
