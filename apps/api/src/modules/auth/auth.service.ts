import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import {
  generateTokenPair,
  hashToken,
  verifyRefreshToken as verifyRefresh,
  type JwtPayload,
} from '../../lib/jwt';
import { logger } from '../../lib/logger';
import type { UserRole, UserTier } from '@qvanta/types';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserWithTokens {
  user: {
    id: string;
    email: string;
    role: UserRole;
    tier: UserTier;
    usageMonth: string;
    usageSims: number;
    avatarPreset: number;
    createdAt: Date;
  };
  tokens: Tokens;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokenPairForUser(user: {
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
}): Tokens {
  return generateTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
  });
}

export async function issueTokensForUser(user: {
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
}): Promise<Tokens> {
  const tokens = generateTokenPairForUser(user);
  await saveRefreshToken(user.id, tokens.refreshToken);
  return tokens;
}

export async function registerUser(input: {
  email: string;
  password: string;
}): Promise<UserWithTokens> {
  const emailLower = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    throw AppError.conflict('Email already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: emailLower,
      passwordHash,
    },
  });

  const tokens = await issueTokensForUser(user);

  logger.info(`User registered: ${user.id}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      usageMonth: user.usageMonth,
      usageSims: user.usageSims,
      avatarPreset: user.avatarPreset,
      createdAt: user.createdAt,
    },
    tokens,
  };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<UserWithTokens> {
  const emailLower = input.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: emailLower } });

  if (!user || !user.passwordHash) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const tokens = await issueTokensForUser(user);

  logger.info(`User logged in: ${user.id}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      usageMonth: user.usageMonth,
      usageSims: user.usageSims,
      avatarPreset: user.avatarPreset,
      createdAt: user.createdAt,
    },
    tokens,
  };
}

export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  const payload = verifyRefresh(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.id, tokenHash, expiresAt: { gt: new Date() } },
  });

  if (!stored) {
    throw AppError.unauthorized('Invalid refresh token');
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) {
    throw AppError.unauthorized('User not found');
  }

  const tokens = await issueTokensForUser(user);

  return tokens;
}

export async function findOrCreateGoogleUser(profile: {
  id: string;
  email: string;
}): Promise<{
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
}> {
  const emailLower = profile.email.toLowerCase();

  let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

  if (!user) {
    user = await prisma.user.upsert({
      where: { email: emailLower },
      update: { googleId: profile.id },
      create: {
        email: emailLower, 
        googleId: profile.id,
      },
    });
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
  };
}

async function saveRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
}

export function toJwtPayload(user: {
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
}): JwtPayload {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
  };
}
