import { Router } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';

// Minimal flat list for Admin screens and health checks
const domainsRouter = Router();
domainsRouter.use(authMiddlewareCompat);

// GET /api/domains – flat array, minimal fields
domainsRouter.get('/', async (_req, res) => {
  try {
    const rows = await prisma.domain.findMany({
      select: { id: true, name: true, customDomain: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);
    res.json(rows);
  } catch (err) {
    console.error('[flat-domains] error', err);
    res.json([]);
  }
});

export default domainsRouter;


