import type { Request, Response } from 'express';
import { Router } from 'express';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { ensureDomainManagementBoard } from '../services/ensureDomainManagementBoard.js';

export const domainsManagementRouter = Router();
domainsManagementRouter.use(authMiddlewareCompat);

// GET /api/domains/:id/management-board
domainsManagementRouter.get('/:id/management-board', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ensured = await ensureDomainManagementBoard(id);
    if (!ensured) return res.status(404).json({ error: 'Domain not found', code: 'DOMAIN_NOT_FOUND' });
    return res.json(ensured);
  } catch (err: any) {
    console.error('ensure DMB error', err);
    return res.status(500).json({ error: 'ENSURE_DMB_FAILED', message: err?.message ?? 'unknown' });
  }
});


