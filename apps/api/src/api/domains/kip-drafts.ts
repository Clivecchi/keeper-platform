import { Router, type Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { logger } from '@keeper/shared';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { normalizeDraftSpecJson, mergeDraftSpecPatch, canonicalizeDraftSpecJson } from '@keeper/shared';
import { normalizeSummary } from '../kip/actions/schema.js';

/**
 * Build draft open URL
 */
function buildDraftOpenUrl(domainSlug: string, draftId: string): string {
  const webOrigin = process.env.WEB_ORIGIN || process.env.NEXT_PUBLIC_WEB_ORIGIN || 'https://www.ke3p.com';
  const path = `/d/${domainSlug}/board?board=domain&draftId=${draftId}`;
  if (!webOrigin || webOrigin.includes('localhost') || webOrigin.includes('127.0.0.1')) {
    return path;
  }
  return `${webOrigin}${path}`;
}

const prisma = new PrismaClient();
const router = Router();

const draftStatusEnum = z.enum(['draft', 'reviewed', 'approved', 'promoted', 'archived']);

function slugifyDraftKey(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${base || 'draft'}-${Math.random().toString(36).slice(2, 8)}`;
}

const createDraftSchema = z.object({
  kind: z.string().min(1, 'kind is required'),
  key: z.string().min(1, 'key is required').optional(),
  title: z.string().min(1, 'title is required'),
  summary: z.string().nullable().optional(),
  spec: z.record(z.any()).optional(),
  agentId: z.string().uuid().optional(),
  keeperId: z.string().min(1).optional(),
  dialogId: z.string().optional(),
}).transform((data) => ({
  ...data,
  key: data.key?.trim() || slugifyDraftKey(data.title),
  summary: normalizeSummary(data.summary),
}));

const updateDraftSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional().nullable(),
  status: draftStatusEnum.optional(),
  spec: z.record(z.any()).optional(),
});

const setActiveDraftSchema = z.object({
  draftId: z.string().uuid(),
});

const mapDraftSpec = (spec: unknown) => normalizeDraftSpecJson(spec);

const mapDraftSummary = (draft: any) => ({
  id: draft.id,
  kind: draft.kind,
  key: draft.key,
  title: draft.title,
  status: draft.status,
  summary: draft.summary ?? null,
  updatedAt: draft.updated_at,
  keeperId: draft.keeper_id ?? null,
});

const mapDraftDetail = (draft: {
  id: string;
  kind: string;
  key: string;
  title: string;
  status: string;
  summary: string | null;
  spec_json: unknown;
  keeper_id?: string | null;
  [key: string]: unknown;
}) => ({
  ...draft,
  spec: mapDraftSpec(draft.spec_json),
  keeperId: draft.keeper_id ?? null,
});

async function ensureSessionForUser(sessionId: string, userId: string) {
  const session = await prisma.kip_sessions.findUnique({
    where: { id: sessionId },
    select: { id: true, user_id: true },
  });

  if (!session) return null;
  if (session.user_id && session.user_id !== userId) return null;
  return session;
}

router.get(
  '/:domainId/kip/drafts',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId } = req.params;
      const keeperId = typeof req.query.keeperId === 'string' ? req.query.keeperId : undefined;
      const drafts = await prisma.kip_drafts.findMany({
        where: {
          domain_id: domainId,
          owner_id: req.user.id,
          ...(keeperId ? { keeper_id: keeperId } : {}),
        },
        select: {
          id: true,
          kind: true,
          key: true,
          title: true,
          status: true,
          summary: true,
          updated_at: true,
          keeper_id: true,
        },
        orderBy: [
          { keeper_id: 'desc' },
          { updated_at: 'desc' },
        ],
      });

      const mappedDrafts = drafts.map(mapDraftSummary);
      
      logger.info({ domainId, count: mappedDrafts.length }, 'kip drafts list ok');
      
      return res.status(200).json({
        drafts: mappedDrafts,
      });
    } catch (error) {
      logger.error({ err: error, domainId: req.params.domainId }, 'kip drafts list failed');
      return res.status(500).json({ error: 'FAILED_TO_LIST_DRAFTS' });
    }
  },
);

router.get(
  '/:domainId/kip/drafts/:draftId',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId, draftId } = req.params;
      const draft = await prisma.kip_drafts.findFirst({
        where: { id: draftId, domain_id: domainId, owner_id: req.user.id },
      });

      if (!draft) {
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND' });
      }

      return res.json({
        draft: mapDraftDetail(draft),
      });
    } catch (error) {
      console.error('[domains:kip-drafts:read:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_READ_DRAFT' });
    }
  },
);

router.get(
  '/:domainId/kip/drafts/:draftId/versions',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }
      const { domainId, draftId } = req.params;
      const draft = await prisma.kip_drafts.findFirst({
        where: { id: draftId, domain_id: domainId, owner_id: req.user.id },
      });
      if (!draft) {
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND' });
      }
      const versions = await prisma.kip_draft_versions.findMany({
        where: { draft_id: draftId },
        orderBy: { version: 'desc' },
        take: 50,
      });
      return res.json({
        versions: versions.map((v) => ({
          id: v.id,
          version: v.version,
          title: v.title,
          summary: v.summary,
          status: v.status,
          spec: v.spec_json,
          createdAt: v.created_at,
        })),
      });
    } catch (error) {
      console.error('[domains:kip-drafts:versions:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_LOAD_VERSIONS' });
    }
  },
);

router.post(
  '/:domainId/kip/drafts',
  authMiddlewareCompat,
  validationMiddleware(createDraftSchema),
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = (req.headers['x-request-id'] || req.headers['x-railway-request-id'] || 'unknown') as string;
    const domainId = req.params.domainId;
    
    try {
      if (!req.user) {
        logger.error({ requestId, domainId }, 'kip drafts create: unauthenticated');
        return res.status(401).json({ error: 'UNAUTHENTICATED', code: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const ownerId = req.user.id;
      const body = createDraftSchema.parse(req.body ?? {});

      if (!body.kind || !body.key || !body.title) {
        logger.warn({ requestId, domainId, ownerId, body }, 'kip drafts create: invalid payload');
        return res.status(400).json({ error: 'INVALID_DRAFT_PAYLOAD', code: 'INVALID_DRAFT_PAYLOAD', message: 'kind, key, and title are required' });
      }

      const now = new Date();

      const keeperId = body.keeperId ?? null;
      const dialogId = body.dialogId ?? null;
      const existing = await prisma.kip_drafts.findFirst({
        where: {
          domain_id: domainId,
          owner_id: ownerId,
          kind: body.kind,
          key: body.key,
          keeper_id: keeperId,
        },
      });

      const baseData = {
        title: body.title,
        summary: body.summary || null,
        status: 'draft',
        spec_json: canonicalizeDraftSpecJson(body.spec ?? {}, {
          proposedBy: req.user.id,
        }) as object,
        updated_at: now,
        agent_id: body.agentId ?? null,
        keeper_id: keeperId,
        dialog_id: dialogId,
      };

      const draft = existing
        ? await prisma.kip_drafts.update({
            where: { id: existing.id },
            data: baseData,
          })
        : await prisma.kip_drafts.create({
            data: {
              domain_id: domainId,
              owner_id: ownerId,
              kind: body.kind,
              key: body.key,
              created_at: now,
              ...baseData,
            },
          });

      // Get domain slug for link generation
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: { slug: true },
      });
      const domainSlug = domain?.slug || domainId;

      logger.info({ requestId, domainId, ownerId, draftId: draft.id, kind: body.kind, key: body.key }, 'kip drafts create ok');

      return res.status(200).json({
        draft: mapDraftDetail(draft),
        links: {
          open: buildDraftOpenUrl(domainSlug, draft.id),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn({ requestId, domainId, err: error.errors }, 'kip drafts create: validation error');
        return res.status(400).json({ error: 'INVALID_DRAFT_PAYLOAD', code: 'VALIDATION_ERROR', message: error.errors.map(e => e.message).join(', ') });
      }
      
      logger.error({ requestId, domainId, err: error, userId: req.user?.id }, 'kip drafts create failed');
      return res.status(500).json({ error: 'FAILED_TO_CREATE_DRAFT', code: 'INTERNAL_ERROR' });
    }
  },
);

router.patch(
  '/:domainId/kip/drafts/:draftId',
  authMiddlewareCompat,
  validationMiddleware(updateDraftSchema),
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId, draftId } = req.params;
      const body = updateDraftSchema.parse(req.body ?? {});

      const existing = await prisma.kip_drafts.findFirst({
        where: { id: draftId, domain_id: domainId, owner_id: req.user.id },
      });

      if (!existing) {
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND' });
      }

      const updatePayload: any = {
        updated_at: new Date(),
      };
      if (body.title !== undefined) updatePayload.title = body.title;
      if (body.summary !== undefined) updatePayload.summary = body.summary ?? null;
      if (body.status !== undefined) updatePayload.status = body.status;
      if (body.spec !== undefined) {
        updatePayload.spec_json = canonicalizeDraftSpecJson(
          mergeDraftSpecPatch(existing.spec_json, body.spec ?? {}),
          { proposedBy: req.user.id },
        ) as object;
      }

      const nextVersion = await prisma.kip_draft_versions.count({ where: { draft_id: existing.id } }).then((n) => n + 1);
      await prisma.kip_draft_versions.create({
        data: {
          draft_id: existing.id,
          version: nextVersion,
          spec_json: existing.spec_json ?? {},
          title: existing.title,
          summary: existing.summary ?? null,
          status: existing.status,
        },
      });

      const updated = await prisma.kip_drafts.update({
        where: { id: existing.id },
        data: updatePayload,
      });

      return res.json({
        draft: mapDraftDetail(updated),
      });
    } catch (error) {
      console.error('[domains:kip-drafts:update:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_UPDATE_DRAFT' });
    }
  },
);

router.post(
  '/:domainId/kip/sessions/:sessionId/active-draft',
  authMiddlewareCompat,
  validationMiddleware(setActiveDraftSchema),
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId, sessionId } = req.params;
      const { draftId } = setActiveDraftSchema.parse(req.body ?? {});

      const draft = await prisma.kip_drafts.findFirst({
        where: { id: draftId, domain_id: domainId, owner_id: req.user.id },
      });

      if (!draft) {
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND' });
      }

      const session = await ensureSessionForUser(sessionId, req.user.id);
      if (!session) {
        return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      }

      await prisma.kip_sessions.updateMany({
        where: { id: sessionId },
        data: { active_draft_id: draft.id, updated_at: new Date() },
      });

      return res.json({ success: true, activeDraft: mapDraftSummary(draft) });
    } catch (error) {
      console.error('[domains:kip-drafts:set-active:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_SET_ACTIVE_DRAFT' });
    }
  },
);

router.delete(
  '/:domainId/kip/sessions/:sessionId/active-draft',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { sessionId } = req.params;
      const session = await ensureSessionForUser(sessionId, req.user.id);
      if (!session) {
        return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      }

      await prisma.kip_sessions.updateMany({
        where: { id: sessionId },
        data: { active_draft_id: null, updated_at: new Date() },
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('[domains:kip-drafts:clear-active:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_CLEAR_ACTIVE_DRAFT' });
    }
  },
);

/**
 * POST /:domainId/kip/drafts/:draftId/publish
 *
 * Publish a domain_json draft: writes draft.spec_json to Domain.frame_json (full replace)
 * and marks the draft as "promoted". Only the domain owner may invoke this.
 *
 * Idempotent: calling again on an already-promoted draft returns 200 without re-writing.
 */
router.post(
  '/:domainId/kip/drafts/:draftId/publish',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = (req.headers['x-request-id'] || req.headers['x-railway-request-id'] || 'unknown') as string;
    const { domainId, draftId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      // Fetch draft — must belong to this domain
      const draft = await prisma.kip_drafts.findFirst({
        where: { id: draftId, domain_id: domainId },
      });

      if (!draft) {
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND', message: 'Draft not found in this domain' });
      }

      // Only domain_json drafts may be published via this handler
      if (draft.kind !== 'domain_json') {
        return res.status(400).json({
          error: 'INVALID_DRAFT_KIND',
          message: `publish is only supported for kind "domain_json", this draft has kind "${draft.kind}"`,
        });
      }

      // Validate spec_json is a non-null plain object
      const specJson = draft.spec_json;
      if (specJson === null || typeof specJson !== 'object' || Array.isArray(specJson)) {
        return res.status(400).json({
          error: 'INVALID_SPEC_JSON',
          message: 'Draft spec_json must be a non-null JSON object before publishing',
        });
      }

      // Fetch domain — needed for ownership check and slug in response
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: { id: true, slug: true, ownerId: true },
      });

      if (!domain) {
        return res.status(404).json({ error: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
      }

      // Only the domain owner may publish to frame_json
      if (domain.ownerId !== req.user.id) {
        logger.warn({ requestId, domainId, draftId, userId: req.user.id }, 'kip draft domain_json publish: forbidden — not domain owner');
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Only the domain owner can publish a domain_json draft',
        });
      }

      // Idempotent: already published
      if (draft.status === 'promoted') {
        logger.info({ requestId, domainId, draftId }, 'kip draft domain_json publish: already promoted, idempotent ok');
        return res.status(200).json({
          success: true,
          idempotent: true,
          message: 'Draft was already published',
          domain: { id: domain.id, slug: domain.slug },
          draftId: draft.id,
          status: draft.status,
        });
      }

      // Write spec_json → Domain.frame_json (full replace) using raw SQL.
      // Prisma ORM silently fails to persist JSONB updates on this column in some
      // configurations — raw SQL with ::jsonb cast is the reliable path.
      const frameJsonStr = JSON.stringify(specJson);
      await prisma.$executeRaw`
        UPDATE "Domain"
        SET frame_json = ${frameJsonStr}::jsonb,
            "updatedAt" = NOW()
        WHERE id = ${domainId}
      `;

      // Mark draft as promoted
      const updatedDraft = await prisma.kip_drafts.update({
        where: { id: draftId },
        data: { status: 'promoted', updated_at: new Date() },
      });

      // Re-fetch domain for the response
      const updatedDomain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: { id: true, slug: true },
      });

      logger.info(
        { requestId, domainId, draftId, userId: req.user.id, domainSlug: updatedDomain?.slug ?? domainId },
        'kip draft domain_json publish ok',
      );

      return res.status(200).json({
        success: true,
        domain: { id: updatedDomain?.id ?? domainId, slug: updatedDomain?.slug ?? domain.slug },
        draftId: updatedDraft.id,
        status: updatedDraft.status,
      });
    } catch (error) {
      logger.error({ requestId, domainId, draftId, err: error, userId: req.user?.id }, 'kip draft domain_json publish failed');
      return res.status(500).json({ error: 'PUBLISH_FAILED', code: 'INTERNAL_ERROR' });
    }
  },
);

router.delete(
  '/:domainId/kip/drafts/:draftId',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = (req.headers['x-request-id'] || req.headers['x-railway-request-id'] || 'unknown') as string;
    const { domainId, draftId } = req.params;

    try {
      if (!req.user) {
        logger.error({ requestId, domainId, draftId }, 'kip drafts delete: unauthenticated');
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const ownerId = req.user.id;

      // Find the draft and verify ownership
      const draft = await prisma.kip_drafts.findFirst({
        where: {
          id: draftId,
          domain_id: domainId,
          owner_id: ownerId,
        },
      });

      if (!draft) {
        logger.warn({ requestId, domainId, draftId, ownerId }, 'kip drafts delete: not found');
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND', message: 'Draft not found in this domain' });
      }

      // Delete the draft
      await prisma.kip_drafts.delete({
        where: { id: draftId },
      });

      logger.info({ requestId, domainId, draftId, ownerId, title: draft.title }, 'kip drafts delete ok');

      return res.json({ success: true });
    } catch (error) {
      logger.error({ requestId, domainId, draftId, err: error, userId: req.user?.id }, 'kip drafts delete failed');
      return res.status(500).json({ error: 'FAILED_TO_DELETE_DRAFT', code: 'INTERNAL_ERROR' });
    }
  },
);

router.post(
  '/:domainId/kip/drafts/:draftId/points/:pointId/accept',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, draftId, pointId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { executeAgentActions } = await import('../kip/agents.js');
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: { slug: true },
      });

      const { results } = await executeAgentActions(
        [{ type: 'draft.point.accept', payload: { draftId, pointId } }],
        {
          domainId,
          domainSlug: domain?.slug ?? null,
          userId: req.user.id,
          allowlist: new Set(['draft.point.accept']),
        },
      );

      const result = results[0];
      if (!result || result.status === 'error') {
        return res.status(result?.errorCode === 'DRAFT_NOT_FOUND' || result?.errorCode === 'POINT_NOT_FOUND' ? 404 : 400).json({
          error: result?.errorCode ?? 'ACCEPT_FAILED',
          message: result?.message ?? 'Failed to accept draft point',
        });
      }

      return res.json({ success: true, result });
    } catch (error) {
      logger.error({ err: error, domainId, draftId, pointId }, 'kip draft point accept failed');
      return res.status(500).json({ error: 'FAILED_TO_ACCEPT_DRAFT_POINT' });
    }
  },
);

export default router;

