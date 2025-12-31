import { Router } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

export const adminQueryRouter = Router();
adminQueryRouter.use(authMiddlewareCompat);

// GET /api/admin/query/domains
adminQueryRouter.get('/domains', async (req, res) => {
  try {
    const includeDeleted = String(req.query.includeDeleted || '0').toLowerCase() === '1';
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const q = (req.query.q ? String(req.query.q) : '').trim();
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

    const where: any = {};
    if (!includeDeleted) (where as any).deletedAt = null;
    if (q) {
      (where as any).OR = [
        { id: q },
        { name: { contains: q, mode: 'insensitive' } },
        { customDomain: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      const rows = await prisma.domain.findMany({
        where,
        select: { id: true, name: true, customDomain: true, createdAt: true, updatedAt: true, deletedAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: cursor ? 1 : 0,
        ...(cursor ? { cursor: { id: cursor } } : {}),
      });
      const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
      return res.json({ dataset: 'domains', count: rows.length, nextCursor, rows });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('column') && msg.includes('deletedAt')) {
        const rows = await prisma.domain.findMany({
          where: (q
            ? {
                OR: [
                  { id: q },
                  { name: { contains: q, mode: 'insensitive' } },
                  { customDomain: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
          select: { id: true, name: true, customDomain: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: cursor ? 1 : 0,
          ...(cursor ? { cursor: { id: cursor } } : {}),
        });
        const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
        return res.json({ dataset: 'domains', count: rows.length, nextCursor, rows });
      }
      throw e;
    }
  } catch (err) {
    console.error('[admin/query/domains] error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default adminQueryRouter;


