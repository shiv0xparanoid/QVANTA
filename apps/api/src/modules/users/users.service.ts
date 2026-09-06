import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import type { User } from '@qvanta/types';

export interface UpdateUserInput {
  avatarPreset?: number;
}

export async function getCurrentUser(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw AppError.notFound('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    googleId: user.googleId ?? undefined,
    passwordHash: user.passwordHash ?? undefined,
    role: user.role,
    tier: user.tier,
    usageMonth: user.usageMonth,
    usageSims: user.usageSims,
    avatarPreset: user.avatarPreset,
    stripeCustomerId: user.stripeCustomerId ?? undefined,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<User> {
  const data: { avatarPreset?: number } = {};

  if (input.avatarPreset !== undefined) {
    if (input.avatarPreset < 0 || input.avatarPreset > 99) {
      throw AppError.validation('avatarPreset must be between 0 and 99');
    }
    data.avatarPreset = input.avatarPreset;
  }

  if (Object.keys(data).length === 0) {
    return getCurrentUser(userId);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return {
    id: user.id,
    email: user.email,
    googleId: user.googleId ?? undefined,
    passwordHash: user.passwordHash ?? undefined,
    role: user.role,
    tier: user.tier,
    usageMonth: user.usageMonth,
    usageSims: user.usageSims,
    avatarPreset: user.avatarPreset,
    stripeCustomerId: user.stripeCustomerId ?? undefined,
    createdAt: user.createdAt.toISOString(),
  };
}
