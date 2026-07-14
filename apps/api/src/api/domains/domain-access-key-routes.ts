/**
 * Domain external access keys — MCP / Cursor / Claude-in-chat domain-bound tokens.
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { DOMAIN_ACCESS_KEY_SCOPES } from '@keeper/shared';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
  requireDomainAdminCompat,
  requireDomainReadCompat,
} from '../../middleware/domainPermissionMiddleware.js';
import {
  createDomainAccessKey,
  listDomainAccessKeys,
  revokeDomainAccessKey,
} from '../../services/DomainAccessKeyService.js';

const router: Router = Router({ mergeParams: true });

const createSchema = z.object({
  label: z.string().min(1).max(120),
  scopes: z.array(z.string()).min(1).default(['library.ro']),
  expires_at: z.string().datetime().optional(),
});

/** GET /api/domains/:domainId/access-keys */
router.get(
  '/:domainId/access-keys',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const domainId = String(req.params.domainId ?? '').trim();
      if (!domainId) return res.status(400).json({ error: 'domainId is required' });
      const keys = await listDomainAccessKeys(domainId);
      return res.json({ keys });
    } catch (err) {
      console.error('[domains:access-keys:list]', err);
      return res.status(500).json({ error: 'Failed to list access keys' });
    }
  },
);

/** POST /api/domains/:domainId/access-keys — secret returned once */
router.post(
  '/:domainId/access-keys',
  authMiddlewareCompat,
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const domainId = String(req.params.domainId ?? '').trim();
      if (!domainId) return res.status(400).json({ error: 'domainId is required' });

      const parsed = createSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
      }

      const authReq = req as AuthenticatedRequest;
      const created = await createDomainAccessKey({
        domainId,
        label: parsed.data.label,
        scopes: parsed.data.scopes,
        createdBy: authReq.user?.id ?? null,
        expiresAt: parsed.data.expires_at ? new Date(parsed.data.expires_at) : null,
      });

      return res.status(201).json({
        key: created,
        scopesAvailable: DOMAIN_ACCESS_KEY_SCOPES,
        usage: {
          header: 'Authorization: Bearer <secret> or x-api-key: <secret>',
          domainHeader: 'x-domain-id must match this domain',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create access key';
      console.error('[domains:access-keys:create]', err);
      return res.status(400).json({ error: message });
    }
  },
);

/** POST /api/domains/:domainId/access-keys/:id/revoke */
router.post(
  '/:domainId/access-keys/:id/revoke',
  authMiddlewareCompat,
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const domainId = String(req.params.domainId ?? '').trim();
      const id = String(req.params.id ?? '').trim();
      if (!domainId || !id) return res.status(400).json({ error: 'domainId and id are required' });

      const key = await revokeDomainAccessKey({ domainId, id });
      return res.json({ key });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke access key';
      const status = message.includes('not found') ? 404 : 400;
      console.error('[domains:access-keys:revoke]', err);
      return res.status(status).json({ error: message });
    }
  },
);

export default router;
