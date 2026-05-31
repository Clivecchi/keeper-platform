/**
 * Capability resolution routes — Chronicle and clients read effective capability sets from data.
 */

import { Router, type Request, type Response } from 'express';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { resolveAgentCapabilities } from '../capabilities/resolveCapabilities.js';

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

export default router;
