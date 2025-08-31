import { Router, type Request, type Response } from 'express';
import { isDbDisabled } from '../../lib/env.js';

export const memoryRouter = Router();

memoryRouter.get('/:id/memory', async (req: Request, res: Response) => {
  try {
    const agentId = req.params.id;
    const n = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 200);

    if (isDbDisabled()) {
      return res.json({
        pinnedNotes: [
          { id: 'p1', text: `Pinned note for ${agentId}`, pinnedAt: new Date().toISOString() }
        ],
        recentLearnings: Array.from({ length: Math.min(n, 5) }).map((_, i) => ({
          id: `m${i + 1}`,
          text: `Learning ${i + 1} for ${agentId}`,
          createdAt: new Date(Date.now() - i * 3600_000).toISOString()
        }))
      });
    }

    // TODO: Replace with Prisma-backed implementation
    const pinnedNotes: any[] = [];
    const recentLearnings: any[] = [];
    return res.json({ pinnedNotes, recentLearnings });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});


