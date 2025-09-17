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
    const result = await ensureDomainManagementBoard(id);

    if (!result.ok && result.error === 'DOMAIN_NOT_FOUND') {
      return res.status(404).json({ error: 'Domain not found', code: 'DOMAIN_NOT_FOUND' });
    }

    if (result.ok) {
      if (result.warnings?.length) {
        console.warn('[DMB:WARN]', { domainId: id, warnings: result.warnings });
      }
      return res.json({ boardId: result.boardId, domainId: result.domainId, warnings: result.warnings ?? [] });
    }

    console.error('[DMB:ERROR]', { domainId: id, result });
    return res.status(500).json({ error: 'ENSURE_DMB_FAILED', hint: result.error ?? 'unknown' });
  } catch (err: any) {
    console.error('[DMB:EXCEPTION]', { err });
    return res.status(500).json({ error: 'ENSURE_DMB_EXCEPTION', message: err?.message ?? 'unknown' });
  }
});


