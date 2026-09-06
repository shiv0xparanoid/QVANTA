import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppError } from './errors';
import type { UserRole, UserTier } from '@qvanta/types';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function signAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(payload: JwtPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateTokenPair(payload: JwtPayload): { accessToken: string; refreshToken: string } {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}
