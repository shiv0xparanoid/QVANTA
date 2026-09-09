import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  refreshTokens,
  findOrCreateGoogleUser,
  issueTokensForUser,
  logoutUser,
} from './auth.service';
import { JwtAuthGuard, type AuthRequest } from './auth.middleware';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const GOOGLE_CALLBACK_PATH = '/auth/google/callback';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL ?? GOOGLE_CALLBACK_PATH,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email || !profile.id) {
            return done(new Error('Invalid Google profile'));
          }
          const user = await findOrCreateGoogleUser({
            id: profile.id,
            email,
          });
          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj as Express.User);
  });
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid input', parsed.error.flatten());
    }
    const result = await registerUser(parsed.data);
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid input', parsed.error.flatten());
    }
    const result = await loginUser(parsed.data);
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.refreshToken as string | undefined;
    let refreshToken: string;

    if (cookieToken) {
      refreshToken = cookieToken;
    } else {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        throw AppError.validation('Invalid input', parsed.error.flatten());
      }
      refreshToken = parsed.data.refreshToken;
    }

    const tokens = await refreshTokens(refreshToken);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', JwtAuthGuard, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const cookieToken = req.cookies?.refreshToken as string | undefined;
    const bodyToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;

    if (userId) {
      await logoutUser(userId, cookieToken ?? bodyToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw AppError.internal('Google OAuth is not configured');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  async (req, res) => {
    try {
      const user = req.user as
        | { id: string; email: string; role: import('@qvanta/types').UserRole; tier: import('@qvanta/types').UserTier }
        | undefined;
      if (!user) {
        throw AppError.unauthorized('Google authentication failed');
      }
      const tokens = await issueTokensForUser(user);
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      const redirectUrl = `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/auth/google/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
      logger.info(`Google OAuth success for user: ${user.id}`);
      res.redirect(redirectUrl);
    } catch (err) {
      logger.error(`Google OAuth callback error: ${err instanceof Error ? err.message : String(err)}`);
      const redirectUrl = `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/login?oauth=error`;
      res.redirect(redirectUrl);
    }
  }
);
