/**
 * Capability resolution routes — Chronicle and clients read effective capability sets from data.
 */

import { Router, type Request, type Response } from 'express';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { resolveAgentCapabilities } from '../capabilities/resolveCapabilities.js';
import { BUILD_BOARD_ID } from '@keeper/shared';
import { buildCloudCeilingStatus } from '../capabilities/boardCeilingStatus.js';
import {
  buildJwtMcpSlice,
  resolveCapabilityLedger,
} from '../capabilities/capabilityLedger.js';

const router = Router();

/**
 * GET /api/capabilities/resolve?agentId=&agentSlug=&boardId=
 * Returns agent capabilities intersected with board ceiling when boardId is provided.
 */
router.get('/resolve', authMiddlewareCompat, async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const agentId = q.agentId;
  const agentSlug = q.agentSlug;
  const boardId = q.boardId;

  if (!agentId && !agentSlug) {
    return res.status(400).json({ error: 'agentId or agentSlug required' });
  }

  const resolved = await resolveAgentCapabilities({ agentId, agentSlug, boardId });
  if (!resolved) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  return res.json({
    success: true,
    data: resolved,
  });
});

/**
 * GET /api/capabilities/ceiling?boardId=build&agentSlug=cloud
 * Read-only Cloud MCP ceiling. Optional agent intersection.
 * Does not change requireCapability or mcp.call gates.
 */
router.get('/ceiling', authMiddlewareCompat, async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const boardId = q.boardId?.trim() || BUILD_BOARD_ID;
  const agentId = q.agentId?.trim();
  const agentSlug = q.agentSlug?.trim();

  try {
    const resolved =
      agentId || agentSlug
        ? await resolveAgentCapabilities({ agentId, agentSlug, boardId })
        : null;
    if ((agentId || agentSlug) && !resolved) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json({
      success: true,
      data: buildCloudCeilingStatus({
        boardId,
        resolved,
      }),
    });
  } catch (error) {
    console.error('[capabilities/ceiling]', error);
    return res.status(500).json({ error: 'Failed to read board capability ceiling' });
  }
});

/**
 * GET /api/capabilities/ledger?domainId=&agentSlug=&boardId=
 * Phase 2 Capability Ledger — one read of MCP scopes (JWT placeholder),
 * Kip allowlist, and Cloud ceiling. Does not change enforcement.
 */
router.get('/ledger', authMiddlewareCompat, async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const domainId = q.domainId?.trim() || null;
  const boardId = q.boardId?.trim() || BUILD_BOARD_ID;
  const agentId = q.agentId?.trim();
  const agentSlug = q.agentSlug?.trim();
  const userId = (req as AuthenticatedRequest).user?.id ?? null;

  try {
    const ledger = await resolveCapabilityLedger({
      mcp: buildJwtMcpSlice(domainId),
      domainId,
      userId,
      agentSlug,
      agentId,
      boardId,
    });
    return res.json({
      success: true,
      data: ledger,
    });
  } catch (error) {
    console.error('[capabilities/ledger]', error);
    return res.status(500).json({ error: 'Failed to read capability ledger' });
  }
});

export default router;
