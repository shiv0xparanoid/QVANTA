import { Router } from 'express';
import { z } from 'zod';
import { JwtAuthGuard, type AuthRequest } from '../auth/auth.middleware';
import { getCurrentUser, updateUser } from './users.service';
import { AppError } from '../../lib/errors';

export const usersRouter = Router();

const updateMeSchema = z.object({
  avatarPreset: z.number().int().min(0).max(99).optional(),
});

usersRouter.get('/me', JwtAuthGuard, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }
    const user = await getCurrentUser(authReq.user.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/me', JwtAuthGuard, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid input', parsed.error.flatten());
    }
    const user = await updateUser(authReq.user.id, parsed.data);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});
