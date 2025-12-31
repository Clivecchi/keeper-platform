import { Router } from 'express';
import { prisma } from '@keeper/database';

const router = Router();

// GET /api/admin/diagnostics/boards
router.get('/diagnostics/boards', async (req, res) => {
  try {
    const [byAgent, dupes, slugDupes] = await Promise.all([
      prisma.board.groupBy({
        by: ['agentId'],
        where: { agentId: { not: null } },
        _count: { _all: true },
      }),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT "agentId", COUNT(*) AS cnt
        FROM "Board"
        WHERE "agentId" IS NOT NULL
        GROUP BY "agentId"
        HAVING COUNT(*) > 1
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT "keeperId", "slug", COUNT(*) AS cnt
        FROM "Board"
        GROUP BY "keeperId", "slug"
        HAVING COUNT(*) > 1
      `),
    ]);

    console.log('[diagnostics:boards] emitted');
    res.json({
      ok: true,
      byAgent,
      duplicatesByAgent: dupes,
      duplicateKeeperSlugPairs: slugDupes,
    });
  } catch (err: any) {
    console.error('[diagnostics:boards:error]', { message: err?.message });
    res.status(500).json({ ok: false, error: err?.message || 'unknown' });
  }
});

export default router;


