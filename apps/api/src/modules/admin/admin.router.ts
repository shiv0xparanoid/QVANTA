import { Router } from 'express';
import { JwtAuthGuard, RequireRole } from '../auth/auth.middleware';
import { prisma } from '../../lib/prisma';

export const adminRouter = Router();

adminRouter.use(JwtAuthGuard, RequireRole('admin', 'org_admin'));

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [users, circuits, conversations, organizations] = await Promise.all([
      prisma.user.count(),
      prisma.circuit.count(),
      prisma.conversation.count(),
      prisma.organization.count(),
    ]);

    const simsAggregate = await prisma.user.aggregate({
      _sum: {
        usageSims: true,
      },
    });

    res.status(200).json({
      users,
      circuits,
      conversations,
      sims: simsAggregate._sum.usageSims ?? 0,
      organizations,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        tier: true,
        usageSims: true,
        usageMonth: true,
        createdAt: true,
      },
      take: 100,
    });

    res.status(200).json({
      data: users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
      })),
      total: users.length,
    });
  } catch (err) {
    next(err);
  }
});
