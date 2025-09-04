import { Router, Request, Response } from 'express';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { prisma } from '@keeper/database';
import { ensureAgentHomeBoard } from '../agents.js';

const router = Router();

// GET /api/admin/inspect/agent-home/:agentId
router.get('/inspect/agent-home/:agentId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as { id: string; platformRoles?: string[] } | undefined;
    const reqId = (req as any).reqId || req.get('x-request-id') || '';

    if (!user?.id) {
      return res.status(401).json({ ok: false, error: 'Unauthorized', reqId });
    }

    const allowedUserId = process.env.ADMIN_USER_ID;
    const isSuperAdmin = Array.isArray(user.platformRoles) && user.platformRoles.includes('super-admin');
    if (allowedUserId ? user.id !== allowedUserId : !isSuperAdmin) {
      return res.status(403).json({ ok: false, error: 'Forbidden', reqId });
    }

    const { agentId } = req.params as { agentId: string };
    const board = await ensureAgentHomeBoard(prisma as any, agentId, { reqId, fallbackKeeperId: user.id });

    const frames = (board.frames || []) as Array<{ frameType: string }>;
    return res.json({
      ok: true,
      board,
      framesCount: frames.length,
      frameTypes: frames.map(f => f.frameType),
      reqId,
    });
  } catch (err: any) {
    const reqId = (req as any).reqId || req.get('x-request-id') || '';
    console.error('[admin:inspect:agent-home:error]', { reqId, error: err?.message || String(err) });
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: err?.message || 'Internal server error', reqId });
  }
});

export default router;


