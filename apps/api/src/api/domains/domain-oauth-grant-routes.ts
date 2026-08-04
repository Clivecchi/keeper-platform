/**
 * Domain MCP OAuth grants — list / revoke / update scopes (External Access UI).
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { DOMAIN_ACCESS_KEY_SCOPES } from '@keeper/shared';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import {
  requireDomainAdminCompat,
  requireDomainReadCompat,
} from '../../middleware/domainPermissionMiddleware.js';
import {
  listOauthGrants,
  revokeOauthGrant,
  updateOauthGrantScopes,
} from '../../services/McpOauthGrantService.js';

const router: Router = Router({ mergeParams: true });

const updateScopesBody = z.object({
  scopes: z.array(z.string()).min(1),
});

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

/** PATCH /api/domains/:domainId/oauth-grants/:id — update scopes on an active grant */
router.patch(
  '/:domainId/oauth-grants/:id',
  authMiddlewareCompat,
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const domainId = String(req.params.domainId ?? '').trim();
      const id = String(req.params.id ?? '').trim();
      if (!domainId || !id) return res.status(400).json({ error: 'domainId and id are required' });
      const parsed = updateScopesBody.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid body',
          scopesAvailable: DOMAIN_ACCESS_KEY_SCOPES,
        });
      }
      const grant = await updateOauthGrantScopes({
        domainId,
        id,
        scopes: parsed.data.scopes,
      });
      return res.json({ grant });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update grant scopes';
      console.error('[domains:oauth-grants:update]', err);
      return res.status(400).json({ error: message });
    }
  },
);

export default router;
