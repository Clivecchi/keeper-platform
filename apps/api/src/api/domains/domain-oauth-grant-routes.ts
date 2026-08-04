/**
 * Domain MCP OAuth grants — list / revoke (External Access UI).
 */
import { Router, type Request, type Response } from 'express';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import {
  requireDomainAdminCompat,
  requireDomainReadCompat,
} from '../../middleware/domainPermissionMiddleware.js';
import { listOauthGrants, revokeOauthGrant } from '../../services/McpOauthGrantService.js';

const router: Router = Router({ mergeParams: true });

/** GET /api/domains/:domainId/oauth-grants */
router.get(
  '/:domainId/oauth-grants',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const domainId = String(req.params.domainId ?? '').trim();
      if (!domainId) return res.status(400).json({ error: 'domainId is required' });
      const grants = await listOauthGrants(domainId);
      return res.json({ grants });
    } catch (err) {
      console.error('[domains:oauth-grants:list]', err);
      return res.status(500).json({ error: 'Failed to list OAuth grants' });
    }
  },
);

/** POST /api/domains/:domainId/oauth-grants/:id/revoke */
router.post(
  '/:domainId/oauth-grants/:id/revoke',
  authMiddlewareCompat,
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const domainId = String(req.params.domainId ?? '').trim();
      const id = String(req.params.id ?? '').trim();
      if (!domainId || !id) return res.status(400).json({ error: 'domainId and id are required' });
      const grant = await revokeOauthGrant({ domainId, id });
      return res.json({ grant });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke grant';
      console.error('[domains:oauth-grants:revoke]', err);
      return res.status(400).json({ error: message });
    }
  },
);

export default router;
