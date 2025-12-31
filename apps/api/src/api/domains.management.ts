import type { Request, Response } from 'express';
import { Router } from 'express';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { ensureDomainManagementBoard } from '../services/ensureDomainManagementBoard.js';
import { ensureDomainTableShape } from '../lib/db-guards.js';
import { PrismaClient, getFeatureFlagService } from '@keeper/database';
import { addLog as addInternalLog } from '../utils/LogStore.js';
import crypto from 'node:crypto';

export const domainsManagementRouter = Router();
domainsManagementRouter.use(authMiddlewareCompat);
const prisma = new PrismaClient();
const featureFlags = getFeatureFlagService();

// GET /api/domains/:id/management-board
domainsManagementRouter.get('/:id/management-board', async (req: Request, res: Response) => {
  try {
    const reqId = (req as any).reqId || req.get('x-request-id') || crypto.randomUUID();
    const { id } = req.params;
    addInternalLog(reqId, { tag: 'DMB_START', domainId: id });
    let guardWarnings: string[] | undefined;
    try {
      guardWarnings = await ensureDomainTableShape();
    } catch (e: any) {
      console.warn('[DMB:GUARD:WARN]', { reqId, domainId: id, message: e?.message });
    }
    try {
      const result = await ensureDomainManagementBoard(id);
      if (!result.ok && result.error === 'DOMAIN_NOT_FOUND') {
        addInternalLog(reqId, { tag: 'DMB_ERROR', name: 'NotFound', code: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
        return res.status(404).json({ error: 'Domain not found', code: 'DOMAIN_NOT_FOUND', reqId });
      }
      if (result.ok) {
        const warnings = [...(guardWarnings ?? []), ...(result.warnings ?? [])];
        if (warnings.length) {
          console.warn('[DMB:WARN]', { reqId, domainId: id, warnings });
        }
        addInternalLog(reqId, { tag: 'DMB_OK', boardId: result.boardId, warnings });
        return res.json({ boardId: result.boardId, domainId: result.domainId, warnings, reqId });
      }
      console.error('[DMB:ERROR]', { reqId, domainId: id, result });
      addInternalLog(reqId, { tag: 'DMB_ERROR', name: 'EnsureFailed', code: result.error ?? 'unknown', message: 'ensureDomainManagementBoard failed' });
      return res.status(500).json({ error: 'ENSURE_DMB_FAILED', reqId });
    } catch (e: any) {
      console.error('[DMB:ERROR]', { reqId, domainId: id, name: e?.name, code: e?.code, message: e?.message, stack: e?.stack });
      addInternalLog(reqId, { tag: 'DMB_ERROR', name: e?.name, code: e?.code, message: e?.message });
      return res.status(500).json({ error: 'ENSURE_DMB_FAILED', reqId });
    }
  } catch (err: any) {
    console.error('[DMB:EXCEPTION]', { err });
    return res.status(500).json({ error: 'ENSURE_DMB_EXCEPTION', message: err?.message ?? 'unknown' });
  }
});

// Temporary debug route (feature-flagged)
domainsManagementRouter.get('/debug/:id', async (req: Request, res: Response) => {
  if (!featureFlags.isEnabled('DEBUG_DMB_ENABLED')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const reqId = (req as any).reqId || req.get('x-request-id') || crypto.randomUUID();
  const id = req.params.id;
  try {
    const guardWarnings = await ensureDomainTableShape();
    const domain = await prisma.domain.findUnique({ where: { id } });
    const board = domain ? await prisma.board.findFirst({ where: { domainId: id } }) : null;
    addInternalLog(reqId, { tag: 'DMB_DEBUG', hasDomain: !!domain, hasBoard: !!board, guardWarnings });
    return res.json({ reqId, hasDomain: !!domain, hasBoard: !!board, guardWarnings });
  } catch (e: any) {
    addInternalLog(reqId, { tag: 'DMB_DEBUG_ERROR', name: e?.name, code: e?.code, message: e?.message });
    return res.status(500).json({ error: 'DMB_DEBUG_FAILED', reqId });
  }
});


