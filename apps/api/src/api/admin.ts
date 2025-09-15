import { Router } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';

const adminRouter = Router();
adminRouter.use(authMiddlewareCompat);

// GET /api/admin/domain-audit – last 30 days
adminRouter.get('/domain-audit', async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await prisma.domainAudit.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default adminRouter;


