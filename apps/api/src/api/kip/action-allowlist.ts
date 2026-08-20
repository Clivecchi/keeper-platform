/**
 * GET /api/kip/actions/allowlist — read-only Kip executor allowlist + canDraft.
 * JWT session. Does not change enforcement.
 */
import { Router, type Request, type Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { resolveKipActionAllowlistStatusForSession } from '../../services/kip/resolveKipActionAllowlistStatus.js';

const router: Router = Router();

router.get('/allowlist', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id ?? null;
    const domainId =
      typeof req.query.domainId === 'string' && req.query.domainId.trim()
        ? req.query.domainId.trim()
        : null;

    const status = await resolveKipActionAllowlistStatusForSession({
      userId,
      domainId,
    });

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[kip/actions/allowlist]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to read Kip action allowlist',
    });
  }
});

export default router;
