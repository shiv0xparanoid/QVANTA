import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { JwtAuthGuard, type AuthRequest } from '../auth/auth.middleware';
import { AppError } from '../../lib/errors';

export const lessonsRouter = Router();

lessonsRouter.use(JwtAuthGuard);

lessonsRouter.get('/', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const modules = await prisma.courseModule.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        progress: {
          where: { userId: authReq.user.id },
          select: { status: true },
          take: 1,
        },
      },
    });

    const data = modules.map((module) => ({
      id: module.id,
      title: module.title,
      slug: module.slug,
      description: module.mdxContent.slice(0, 180),
      content: module.mdxContent,
      order: module.order ?? 0,
      progress: module.progress[0]?.status ?? 'not_started',
      embedded: module.embedded,
      createdAt: module.createdAt.toISOString(),
    }));

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});
