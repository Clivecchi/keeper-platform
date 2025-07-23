import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../../middleware/platformRoleMiddleware.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/admin/users
 * Optional ?search= query filters by name or email (ILIKE)
 * Returns last 20 users if no search.
 */
router.get('/', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim();
  try {
    const users = await prisma.users.findMany({
      where: search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      } : {},
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ users });
  } catch (error) {
    console.error('[AdminUsers] search error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 