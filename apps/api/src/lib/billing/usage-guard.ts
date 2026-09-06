import { prisma } from '../prisma';
import { AppError } from '../errors';
import { getTierLimits } from './tiers';
import type { JwtPayload } from '../jwt';
import type { UserTier } from '@qvanta/types';

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function ensureUsageMonthReset(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, usageMonth: true, usageSims: true },
  });

  if (!user) {
    throw AppError.notFound('User not found');
  }

  const currentMonth = getCurrentMonth();
  if (user.usageMonth !== currentMonth) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        usageMonth: currentMonth,
        usageSims: 0,
      },
    });
  }
}

export async function enforceSimulationLimits(
  user: JwtPayload,
  shots?: number
): Promise<void> {
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      tier: true,
      usageMonth: true,
      usageSims: true,
    },
  });

  if (!fresh) {
    throw AppError.notFound('User not found');
  }

  const currentMonth = getCurrentMonth();
  let usageSims = fresh.usageSims;

  if (fresh.usageMonth !== currentMonth) {
    const reset = await prisma.user.update({
      where: { id: user.id },
      data: {
        usageMonth: currentMonth,
        usageSims: 0,
      },
      select: { usageSims: true },
    });
    usageSims = reset.usageSims;
  }

  const tier = fresh.tier as UserTier;
  const limits = getTierLimits(tier);

  if (tier === 'free' && usageSims >= limits.simsPerMonth) {
    throw AppError.paymentRequired(
      'Monthly simulation limit exceeded. Upgrade to Pro for unlimited simulations.',
      'usage_limit_exceeded',
      { simsUsed: usageSims, simsLimit: limits.simsPerMonth }
    );
  }

  if (shots !== undefined && shots > limits.maxShots) {
    throw AppError.badRequest(
      `Shots exceed tier limit of ${limits.maxShots}.`,
      {
        code: 'shots_exceed_tier_limit',
        shotsRequested: shots,
        shotsLimit: limits.maxShots,
      }
    );
  }
}

export async function incrementSimulationUsage(userId: string): Promise<void> {
  await ensureUsageMonthReset(userId);
  await prisma.user.update({
    where: { id: userId },
    data: {
      usageSims: { increment: 1 },
    },
  });
}
