import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { hashPassword } from '../modules/auth/auth.service';

export async function seedAdminUser(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    logger.info('Admin seeding skipped: ADMIN_EMAIL or ADMIN_PASSWORD_HASH not set');
    return;
  }

  try {
    let passwordHash: string;
    if (adminPasswordHash.startsWith('$2b$') || adminPasswordHash.startsWith('$2a$')) {
      passwordHash = adminPasswordHash;
    } else {
      passwordHash = await hashPassword(adminPasswordHash);
    }

    const emailLower = adminEmail.toLowerCase();

    await prisma.user.upsert({
      where: { email: emailLower },
      update: {
        role: 'admin',
        tier: 'institution',
        passwordHash,
      },
      create: {
        email: emailLower,
        passwordHash,
        role: 'admin',
        tier: 'institution',
      },
    });

    logger.info(`Admin user seeded: ${emailLower}`);
  } catch (err) {
    logger.error(`Failed to seed admin user: ${err instanceof Error ? err.message : String(err)}`);
  }
}
