import { Router, Request, Response } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

const router = Router();

// POST /api/admin/repair/agent-board/:agentId
router.post('/repair/agent-board/:agentId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ ok: false, error: 'Not allowed in production' });
    }
    const user = (req as any).user;
    const isAdmin = Array.isArray(user?.platformRoles) && user.platformRoles.includes('super-admin');
    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: 'Admin only' });
    }

    const { agentId } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      const boards = await tx.board.findMany({ where: { agentId }, orderBy: { updatedAt: 'desc' } });
      if (boards.length === 0) return { fixedBoards: 0, deletedFrames: 0, deletedConfigs: 0 };
      const [keep, ...rest] = boards;

      // Archive extras
      let fixedBoards = 0;
      for (const b of rest) {
        await tx.board.update({ where: { id: b.id }, data: { access: { ...(b.access as any || {}), status: 'archived', archivedAt: new Date().toISOString() } as any } });
        fixedBoards++;
      }

      // For kept board: ensure unique frames per role
      const roles = ['dialog', 'agent_preview', 'topics', 'draft', 'config_panel'];
      let deletedFrames = 0;
      for (const role of roles) {
        const frames = await tx.frameInstance.findMany({ where: { boardId: keep.id, role }, orderBy: { createdAt: 'asc' } });
        if (frames.length > 1) {
          const [, ...extras] = frames;
          for (const f of extras) {
            await tx.frameInstance.delete({ where: { id: f.id } });
            deletedFrames++;
          }
        }
      }

      // Clean duplicate configs by default names (global uniqueness enforced)
      let deletedConfigs = 0;
      const defaultNames = ['dialogic-default', 'preview-default', 'topics-default', 'draft-default', 'config-panel-default'];
      for (const name of defaultNames) {
        const configs = await tx.frameConfig.findMany({ where: { name }, orderBy: { createdAt: 'asc' } });
        if (configs.length > 1) {
          const [, ...extras] = configs;
          for (const c of extras) {
            await tx.frameConfig.delete({ where: { id: c.id } });
            deletedConfigs++;
          }
        }
      }

      return { fixedBoards, deletedFrames, deletedConfigs };
    });

    console.warn('[agent-home:repair]', { agentId: req.params.agentId, ...result });
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'unknown' });
  }
});

export default router;


