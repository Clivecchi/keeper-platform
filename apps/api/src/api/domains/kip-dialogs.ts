/**
 * Dialog API Routes
 * =================
 * Persistent, named conversation containers that group kip_sessions.
 *
 * Routes (all nested under /api/domains/:domainId):
 *   POST   /kip/dialogs             — create a new Dialog
 *   POST   /kip/dialogs/ingest      — create Dialog + Document Points from external markdown
 *   POST   /kip/dialogs/:dialogId/ingest — attach markdown Points to an existing Dialog
 *   GET    /kip/dialogs             — list Dialogs for a domain (filtered by scope)
 *   GET    /kip/dialogs/:dialogId   — get a single Dialog with its sessions
 *   GET    /kip/dialogs/:dialogId/document — Chronicle Document (Forward/Step/Sections + manuscripts + components)
 *   PATCH  /kip/dialogs/:dialogId/document — author title, Forward, stage, Sections
 *   POST   /kip/dialogs/:dialogId/document/points — author add Point
 *   PATCH  /kip/dialogs/:dialogId/document/points/order — author reorder Points
 *   PATCH  /kip/dialogs/:dialogId/document/points/:pointId — author update Point
 *   DELETE /kip/dialogs/:dialogId/document/points/:pointId — author delete Point
 *   POST   /kip/dialogs/:dialogId/document-components — register a non-manuscript draft as Document component
 *   PATCH  /kip/dialogs/:dialogId   — update title, archive, or document_status
 *   DELETE /kip/dialogs/:dialogId   — hard delete (sessions/drafts SetNull dialog_id)
 *
 * Audience scoping:
 *   available_to: ["admin"]   — domain-level; user_id is null
 *   available_to: ["keeper"]  — per-user; user_id populated from auth session
 *   Guest conversations are ephemeral (Session only) and never create a Dialog.
 *
 * KE3P · Keeper Platform · April 2026
 */

import { Router, type Response } from 'express';
import { prisma } from '@keeper/database';
import { z } from 'zod';
import {
  logger,
  parseDocumentComponentDeclarations,
  parseDocumentPathDeclarations,
} from '@keeper/shared';
import {
  authorClearSectionMembership,
  authorCreateDocumentPoint,
  authorDeleteDocumentPoint,
  authorReorderDocumentPoints,
  authorUpdateDocumentPoint,
} from '../../services/kip/authorDialogDocument.js';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';
import {
  disableDialogCastMember,
  enableDialogCastMember,
  listDialogCastCandidates,
  listDialogCastMembers,
} from '../../services/domains/dialogCastMembership.js';
import { listChronicleEventsForDialog } from '../../services/kip/chronicleEvents.js';
import { loadDialogDocumentForChronicle } from '../../services/kip/loadDialogDocumentForChronicle.js';
import { ensureDialogGlossCarrier } from '../../services/kip/ensureDialogGlossCarrier.js';
import { buildDomainNavIndex } from '../../services/kip/buildDomainNavIndex.js';
import { registerDialogDocumentComponent } from '../../services/kip/registerDialogDocumentComponent.js';
import {
  ingestErrorStatus,
  ingestExternalDocument,
  IngestExternalDocumentError,
} from '../../services/kip/ingestExternalDocument.js';

const router = Router();

// ─── GET /api/domains/:domainId/nav-index ────────────────────────────────────
// Cross-nav index: Dialogs + Drafts + Keepers + Library (member search surface).

router.get(
  '/:domainId/nav-index',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }
      const index = await buildDomainNavIndex(domainId);
      const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
      const items = q
        ? index.items.filter(
            (item) =>
              item.title.toLowerCase().includes(q)
              || (item.subtitle?.toLowerCase().includes(q) ?? false)
              || item.kind.includes(q),
          )
        : index.items;
      return res.json({ domainId: index.domainId, items, total: items.length });
    } catch (error) {
      logger.error({ err: error, domainId }, '[nav-index] failed');
      return res.status(500).json({ error: 'FAILED_TO_BUILD_NAV_INDEX' });
    }
  },
);

// ─── Validation schemas ───────────────────────────────────────────────────────

const createDialogSchema = z.object({
  title: z.string().min(1).max(200),
  available_to: z.array(z.enum(['admin', 'keeper'])).min(1),
  context: z.object({
    board: z.string().optional().default(''),
    frame: z.string().optional().default(''),
    subject: z.string().optional().default(''),
  }),
});

const ingestDialogSchema = z.object({
  markdown: z.string().min(1).max(200_000),
  title: z.string().min(1).max(200).optional(),
  source: z.string().min(1).max(80).optional(),
});

const documentStatusSchema = z.enum(['drafts', 'kept', 'presented']);

const documentPathDeclarationSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  prelude: z.string().max(2000).optional(),
  imageUrl: z.string().max(2000).optional(),
});

const documentComponentDeclarationSchema = z.object({
  draftId: z.string().uuid(),
  order: z.number().int().min(0).max(999).optional(),
  label: z.string().min(1).max(200).optional(),
});

const registerDocumentComponentSchema = z.object({
  draftId: z.string().uuid(),
  label: z.string().min(1).max(200).optional(),
});

const authorDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  document_status: documentStatusSchema.optional(),
  forward_title: z.string().min(1).max(300).nullable().optional(),
  forward_description: z.string().max(8000).nullable().optional(),
  document_paths: z.array(documentPathDeclarationSchema).max(40).optional(),
});

const authorPointCreateSchema = z.object({
  title: z.string().max(300).optional(),
  content: z.string().max(8000).optional(),
  sectionId: z.string().max(80).nullable().optional(),
});

const authorPointUpdateSchema = z.object({
  title: z.string().max(300).optional(),
  content: z.string().max(8000).optional(),
  sectionId: z.string().max(80).nullable().optional(),
});

const authorPointOrderSchema = z.object({
  pointIds: z.array(z.string().min(1)).min(1).max(400),
});

const updateDialogSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  is_archived: z.boolean().optional(),
  document_status: documentStatusSchema.optional(),
  forward_title: z.string().min(1).max(300).nullable().optional(),
  forward_description: z.string().min(1).max(8000).nullable().optional(),
  step_title: z.string().min(1).max(300).nullable().optional(),
  step_body: z.string().min(1).max(8000).nullable().optional(),
  document_paths: z.array(documentPathDeclarationSchema).max(40).nullable().optional(),
  document_components: z.array(documentComponentDeclarationSchema).max(40).nullable().optional(),
});

const enableCastMemberSchema = z.object({
  /** Home domain whose lead agent to enable — server resolves the lead; never trust a client agentId. */
  homeDomainId: z.string().min(1),
});

function castMembershipErrorStatus(code: string | undefined): number {
  switch (code) {
    case 'DIALOG_NOT_FOUND':
    case 'HOME_DOMAIN_NOT_FOUND':
    case 'CAST_MEMBER_NOT_FOUND':
      return 404;
    case 'ADMIN_REQUIRED_ON_HOME_DOMAIN':
      return 403;
    case 'CANNOT_ENABLE_CURRENT_DOMAIN_LEAD':
    case 'HOME_DOMAIN_HAS_NO_LEAD':
    case 'AGENT_ALREADY_ON_DOMAIN_ROSTER':
      return 400;
    default:
      return 500;
  }
}

// ─── POST /api/domains/:domainId/kip/dialogs ─────────────────────────────────
// Create a new Dialog. Auth required for all scopes.
// admin-scoped: user_id = null; keeper-scoped: user_id = req.user.id

router.post(
  '/:domainId/kip/dialogs',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const parsed = createDialogSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const { title, available_to, context } = parsed.data;

      // Guest conversations are ephemeral by design — they must never create
      // a Dialog record. The available_to field may only contain "admin" or
      // "keeper". "guest" is not a valid Dialog scope.
      if (available_to.some((s) => s === 'guest' as string)) {
        return res.status(400).json({ error: 'INVALID_SCOPE', message: 'Guest conversations cannot be persisted as Dialogs.' });
      }

      // admin-scoped dialogs: user_id is null (domain-level)
      // keeper-scoped dialogs: user_id = current user
      const isKeeperScoped = available_to.includes('keeper') && !available_to.includes('admin');
      const userId = isKeeperScoped ? req.user.id : null;

      const dialog = await prisma.dialog.create({
        data: {
          title,
          title_source: 'user_set',
          domain_id: domainId,
          user_id: userId,
          available_to,
          context,
        },
      });

      logger.info({ domainId, dialogId: dialog.id, available_to }, '[kip-dialogs] created');
      return res.status(201).json({ dialog });
    } catch (error) {
      logger.error({ err: error, domainId }, '[kip-dialogs] create failed');
      return res.status(500).json({ error: 'FAILED_TO_CREATE_DIALOG' });
    }
  },
);

async function handleDialogIngest(
  req: AuthenticatedRequest,
  res: Response,
  dialogId: string | null,
): Promise<Response> {
  const { domainId } = req.params;
  if (!req.user) {
    return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
  }
  const parsed = ingestDialogSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
  }
  try {
    const result = await ingestExternalDocument({
      domainId,
      userId: req.user.id,
      markdown: parsed.data.markdown,
      title: parsed.data.title,
      source: parsed.data.source,
      dialogId,
    });
    logger.info(
      {
        domainId,
        dialogId: result.dialogId,
        created: result.created,
        appendedCount: result.appendedCount,
      },
      '[kip-dialogs] ingest ok',
    );
    return res.status(result.created ? 201 : 200).json({ ingest: result });
  } catch (error) {
    if (error instanceof IngestExternalDocumentError) {
      return res.status(ingestErrorStatus(error.code)).json({
        error: error.code,
        message: error.message,
      });
    }
    logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] ingest failed');
    return res.status(500).json({ error: 'FAILED_TO_INGEST_WRITING' });
  }
}

// ─── POST /api/domains/:domainId/kip/dialogs/ingest ──────────────────────────
// Create a new Dialog + manuscript Points + session from external markdown.

router.post(
  '/:domainId/kip/dialogs/ingest',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    return handleDialogIngest(req, res, null);
  },
);

// ─── POST /api/domains/:domainId/kip/dialogs/:dialogId/ingest ────────────────
// Attach markdown Points to an existing Dialog's manuscript.

router.post(
  '/:domainId/kip/dialogs/:dialogId/ingest',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    return handleDialogIngest(req, res, req.params.dialogId);
  },
);

// ─── GET /api/domains/:domainId/kip/dialogs ──────────────────────────────────
// List Dialogs for a domain, optionally filtered by available_to scope.
// Excludes archived dialogs by default unless ?include_archived=true.
// Returns Dialogs with session count.

router.get(
  '/:domainId/kip/dialogs',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const scope = typeof req.query.available_to === 'string' ? req.query.available_to : null;
      const includeArchived = req.query.include_archived === 'true';

      const dialogs = await prisma.dialog.findMany({
        where: {
          domain_id: domainId,
          is_archived: includeArchived ? undefined : false,
          ...(scope === 'keeper'
            ? { user_id: req.user.id, available_to: { has: 'keeper' } }
            : scope === 'admin'
            ? { available_to: { has: 'admin' } }
            : {
                OR: [
                  { available_to: { has: 'admin' } },
                  { user_id: req.user.id, available_to: { has: 'keeper' } },
                ],
              }),
        },
        include: {
          _count: { select: { sessions: true } },
        },
        orderBy: { updated_at: 'desc' },
      });

      return res.json({
        dialogs: dialogs.map((d) => ({
          id: d.id,
          title: d.title,
          title_source: d.title_source,
          domain_id: d.domain_id,
          user_id: d.user_id,
          available_to: d.available_to,
          context: d.context,
          is_archived: d.is_archived,
          document_status: d.document_status,
          forward_title: d.forward_title,
          forward_description: d.forward_description,
          step_title: d.step_title,
          step_body: d.step_body,
          document_paths: parseDocumentPathDeclarations(d.document_paths),
          session_count: d._count.sessions,
          created_at: d.created_at,
          updated_at: d.updated_at,
        })),
      });
    } catch (error) {
      logger.error({ err: error, domainId }, '[kip-dialogs] list failed');
      return res.status(500).json({ error: 'FAILED_TO_LIST_DIALOGS' });
    }
  },
);

// ─── GET /api/domains/:domainId/kip/dialogs/resolve/active ─────────────────
// MUST be registered before `/:dialogId` so "resolve" is not captured as an id.

router.get(
  '/:domainId/kip/dialogs/resolve/active',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const board = typeof req.query.board === 'string' ? req.query.board : '';
      const frame = typeof req.query.frame === 'string' ? req.query.frame : '';
      const scope = typeof req.query.available_to === 'string' ? req.query.available_to : 'admin';

      const contextFilters =
        board || frame
          ? [
              ...(board ? [{ context: { path: ['board'], equals: board } as const }] : []),
              ...(frame ? [{ context: { path: ['frame'], equals: frame } as const }] : []),
            ]
          : [];

      const dialog = await prisma.dialog.findFirst({
        where: {
          domain_id: domainId,
          is_archived: false,
          ...(scope === 'keeper'
            ? { user_id: req.user.id, available_to: { has: 'keeper' } }
            : { user_id: null, available_to: { has: 'admin' } }),
          ...(contextFilters.length ? { AND: contextFilters } : {}),
        },
        include: {
          sessions: {
            orderBy: { created_at: 'asc' },
            include: {
              _count: {
                select: { kip_messages: true },
              },
            },
          },
        },
        orderBy: { updated_at: 'desc' },
      });

      const payload = dialog
        ? {
            ...dialog,
            sessions: dialog.sessions.map((session) => {
              const { _count, ...rest } = session;
              return {
                ...rest,
                messageCount: _count.kip_messages,
              };
            }),
          }
        : null;

      return res.json({ dialog: payload });
    } catch (error) {
      logger.error({ err: error, domainId }, '[kip-dialogs] resolve active failed');
      return res.status(500).json({ error: 'FAILED_TO_RESOLVE_DIALOG' });
    }
  },
);

// ─── GET /api/domains/:domainId/kip/dialogs/:dialogId ────────────────────────
// Get a single Dialog with its sessions in chronological order.
// Used to resume a Dialog — loads full conversation history.

router.get(
  '/:domainId/kip/dialogs/:dialogId',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const dialog = await prisma.dialog.findFirst({
        where: {
          id: dialogId,
          domain_id: domainId,
          OR: [
            { available_to: { has: 'admin' } },
            { user_id: req.user.id, available_to: { has: 'keeper' } },
          ],
        },
        include: {
          sessions: {
            orderBy: { created_at: 'asc' },
            include: {
              _count: {
                select: { kip_messages: true },
              },
            },
          },
        },
      });

      if (!dialog) {
        return res.status(404).json({ error: 'DIALOG_NOT_FOUND' });
      }

      const payload = {
        ...dialog,
        sessions: dialog.sessions.map((session) => {
          const { _count, ...rest } = session;
          return {
            ...rest,
            messageCount: _count.kip_messages,
          };
        }),
      };

      return res.json({ dialog: payload });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] get failed');
      return res.status(500).json({ error: 'FAILED_TO_GET_DIALOG' });
    }
  },
);

// ─── GET /api/domains/:domainId/kip/dialogs/:dialogId/document ───────────────
// Chronicle Document hydration — cover fields + manuscript drafts with Points.
// Intentionally omits sessions (session resume uses GET :dialogId).

router.get(
  '/:domainId/kip/dialogs/:dialogId/document',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const document = await loadDialogDocumentForChronicle(dialogId, domainId, {
        userId: req.user.id,
      });
      if (!document) {
        return res.status(404).json({ error: 'DIALOG_NOT_FOUND' });
      }

      return res.json({ document });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] document failed');
      return res.status(500).json({ error: 'FAILED_TO_GET_DIALOG_DOCUMENT' });
    }
  },
);

// ─── PATCH /…/dialogs/:dialogId/document — author fields (inline Chronicle) ──

router.patch(
  '/:domainId/kip/dialogs/:dialogId/document',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED' });
      }
      const parsed = authorDocumentSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const existing = await prisma.dialog.findFirst({
        where: { id: dialogId, domain_id: domainId, is_archived: false },
        select: { id: true, document_paths: true },
      });
      if (!existing) {
        return res.status(404).json({ error: 'DIALOG_NOT_FOUND' });
      }

      const data: {
        title?: string;
        title_source?: string;
        document_status?: 'drafts' | 'kept' | 'presented';
        forward_title?: string | null;
        forward_description?: string | null;
        document_paths?: object;
      } = {};
      if (parsed.data.title !== undefined) {
        data.title = parsed.data.title;
        data.title_source = 'user_set';
      }
      if (parsed.data.document_status !== undefined) {
        data.document_status = parsed.data.document_status;
      }
      if (parsed.data.forward_title !== undefined) {
        data.forward_title = parsed.data.forward_title;
      }
      if (parsed.data.forward_description !== undefined) {
        data.forward_description = parsed.data.forward_description?.trim()
          ? parsed.data.forward_description
          : null;
      }
      if (parsed.data.document_paths !== undefined) {
        const nextPaths = parseDocumentPathDeclarations(parsed.data.document_paths);
        data.document_paths = nextPaths;
        const previous = parseDocumentPathDeclarations(existing.document_paths);
        const nextIds = new Set(nextPaths.map((path) => path.id));
        for (const path of previous) {
          if (!nextIds.has(path.id)) {
            await authorClearSectionMembership({ domainId, dialogId, sectionId: path.id });
          }
        }
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'NO_CHANGES' });
      }

      const updated = await prisma.dialog.update({
        where: { id: dialogId },
        data,
      });
      return res.json({ dialog: updated });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] author document failed');
      return res.status(500).json({ error: 'FAILED_TO_UPDATE_DOCUMENT' });
    }
  },
);

router.post(
  '/:domainId/kip/dialogs/:dialogId/document/points',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED' });
      }
      const parsed = authorPointCreateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      const result = await authorCreateDocumentPoint({
        domainId,
        dialogId,
        userId: req.user.id,
        title: parsed.data.title,
        content: parsed.data.content,
        sectionId: parsed.data.sectionId,
      });
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error, message: result.message });
      }
      return res.json({ ok: true, pointId: result.pointId });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] author point create failed');
      return res.status(500).json({ error: 'FAILED_TO_CREATE_POINT' });
    }
  },
);

router.patch(
  '/:domainId/kip/dialogs/:dialogId/document/points/order',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED' });
      }
      const parsed = authorPointOrderSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      const result = await authorReorderDocumentPoints({
        domainId,
        dialogId,
        pointIds: parsed.data.pointIds,
      });
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error, message: result.message });
      }
      return res.json({ ok: true });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] author point order failed');
      return res.status(500).json({ error: 'FAILED_TO_REORDER_POINTS' });
    }
  },
);

router.patch(
  '/:domainId/kip/dialogs/:dialogId/document/points/:pointId',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId, pointId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED' });
      }
      const parsed = authorPointUpdateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      const result = await authorUpdateDocumentPoint({
        domainId,
        dialogId,
        pointId,
        title: parsed.data.title,
        content: parsed.data.content,
        sectionId: parsed.data.sectionId,
      });
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error, message: result.message });
      }
      return res.json({ ok: true });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId, pointId }, '[kip-dialogs] author point update failed');
      return res.status(500).json({ error: 'FAILED_TO_UPDATE_POINT' });
    }
  },
);

router.delete(
  '/:domainId/kip/dialogs/:dialogId/document/points/:pointId',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId, pointId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED' });
      }
      const result = await authorDeleteDocumentPoint({ domainId, dialogId, pointId });
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error, message: result.message });
      }
      return res.json({ ok: true });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId, pointId }, '[kip-dialogs] author point delete failed');
      return res.status(500).json({ error: 'FAILED_TO_DELETE_POINT' });
    }
  },
);

// ─── POST /api/domains/:domainId/kip/dialogs/:dialogId/document-components ───
// Register a non-manuscript draft as an explicit Document component.

router.post(
  '/:domainId/kip/dialogs/:dialogId/document-components',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const parsed = registerDocumentComponentSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'INVALID_BODY',
          message: 'draftId (uuid) is required',
          details: parsed.error.flatten(),
        });
      }

      const result = await registerDialogDocumentComponent({
        domainId,
        dialogId,
        draftId: parsed.data.draftId,
        label: parsed.data.label,
        userId: req.user.id,
      });

      if (result.ok === false) {
        const status =
          result.error === 'DIALOG_NOT_FOUND' || result.error === 'DRAFT_NOT_FOUND'
            ? 404
            : 400;
        return res.status(status).json({ error: result.error, message: result.message });
      }

      logger.info(
        {
          domainId,
          dialogId,
          draftId: result.draft.id,
          created: result.created,
          userId: req.user.id,
        },
        '[kip-dialogs] document component registered',
      );
      return res.status(result.created ? 201 : 200).json({
        components: result.components,
        draft: result.draft,
        created: result.created,
      });
    } catch (error) {
      logger.error(
        { err: error, domainId, dialogId },
        '[kip-dialogs] document-components failed',
      );
      return res.status(500).json({ error: 'FAILED_TO_REGISTER_DOCUMENT_COMPONENT' });
    }
  },
);

// ─── POST /api/domains/:domainId/kip/dialogs/:dialogId/gloss-carrier ─────────
// Ensure a kip_message exists to host Document Point glossThreads (Chronicle Gloss).

router.post(
  '/:domainId/kip/dialogs/:dialogId/gloss-carrier',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;
    const agentId =
      typeof req.body?.agentId === 'string' && req.body.agentId.trim()
        ? req.body.agentId.trim()
        : null;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const carrier = await ensureDialogGlossCarrier({
        domainId,
        dialogId,
        userId: req.user.id,
        agentId,
      });
      return res.json({ carrier });
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code)
          : undefined;
      if (code === 'DIALOG_NOT_FOUND') {
        return res.status(404).json({ error: 'DIALOG_NOT_FOUND' });
      }
      if (code === 'AGENT_REQUIRED_FOR_GLOSS_CARRIER') {
        return res.status(400).json({
          error: 'AGENT_REQUIRED_FOR_GLOSS_CARRIER',
          message: 'Pass agentId when the Dialog has no sessions yet.',
        });
      }
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] gloss-carrier failed');
      return res.status(500).json({ error: 'FAILED_TO_ENSURE_GLOSS_CARRIER' });
    }
  },
);

// ─── GET /api/domains/:domainId/kip/dialogs/:dialogId/chronicle-events ───────
// Dialog-scoped History timeline. This intentionally does not alter Realm Feed.

router.get(
  '/:domainId/kip/dialogs/:dialogId/chronicle-events',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const events = await listChronicleEventsForDialog({
        domainId,
        dialogId,
        userId: req.user.id,
      });
      if (!events) {
        return res.status(404).json({ error: 'DIALOG_NOT_FOUND' });
      }

      return res.json({ events, dialogId });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] chronicle-events failed');
      return res.status(500).json({ error: 'FAILED_TO_LIST_CHRONICLE_EVENTS' });
    }
  },
);

// ─── PATCH /api/domains/:domainId/kip/dialogs/:dialogId ──────────────────────
// Update a Dialog's title or archive it.
// Only the creating user or an admin may update.

router.patch(
  '/:domainId/kip/dialogs/:dialogId',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const parsed = updateDialogSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const existing = await prisma.dialog.findFirst({
        where: {
          id: dialogId,
          domain_id: domainId,
          OR: [
            // Admin-scoped: any authenticated user with domain write can update
            { available_to: { has: 'admin' } },
            // Keeper-scoped: only the owning user can update
            { user_id: req.user.id, available_to: { has: 'keeper' } },
          ],
        },
      });

      if (!existing) {
        return res.status(404).json({ error: 'DIALOG_NOT_FOUND' });
      }

      const updateData: {
        title?: string;
        title_source?: string;
        is_archived?: boolean;
        document_status?: 'drafts' | 'kept' | 'presented';
        forward_title?: string | null;
        forward_description?: string | null;
        step_title?: string | null;
        step_body?: string | null;
        document_paths?: object | null;
        document_components?: object | null;
      } = {};
      if (parsed.data.title !== undefined) {
        updateData.title = parsed.data.title;
        // Explicit rename → named Dialog (leaves Chatter).
        updateData.title_source = 'user_set';
      }
      if (parsed.data.is_archived !== undefined) updateData.is_archived = parsed.data.is_archived;
      if (parsed.data.document_status !== undefined) {
        updateData.document_status = parsed.data.document_status;
      }
      if (parsed.data.forward_title !== undefined) {
        updateData.forward_title = parsed.data.forward_title;
      }
      if (parsed.data.forward_description !== undefined) {
        updateData.forward_description = parsed.data.forward_description;
      }
      if (parsed.data.step_title !== undefined) {
        updateData.step_title = parsed.data.step_title;
      }
      if (parsed.data.step_body !== undefined) {
        updateData.step_body = parsed.data.step_body;
      }
      if (parsed.data.document_paths !== undefined) {
        updateData.document_paths =
          parsed.data.document_paths === null
            ? null
            : parseDocumentPathDeclarations(parsed.data.document_paths);
      }
      if (parsed.data.document_components !== undefined) {
        updateData.document_components =
          parsed.data.document_components === null
            ? null
            : parseDocumentComponentDeclarations(parsed.data.document_components);
      }

      const updated = await prisma.dialog.update({
        where: { id: dialogId },
        data: updateData,
      });

      logger.info({ domainId, dialogId, userId: req.user.id }, '[kip-dialogs] updated');
      return res.json({ dialog: updated });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] update failed');
      return res.status(500).json({ error: 'FAILED_TO_UPDATE_DIALOG' });
    }
  },
);

// ─── DELETE /api/domains/:domainId/kip/dialogs/:dialogId ─────────────────────
// Hard-delete a Dialog. Sessions and drafts keep their rows; dialog_id SetNull.
// Mirrors create/rename/archive ownership rules on PATCH.

router.delete(
  '/:domainId/kip/dialogs/:dialogId',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const existing = await prisma.dialog.findFirst({
        where: {
          id: dialogId,
          domain_id: domainId,
          OR: [
            { available_to: { has: 'admin' } },
            { user_id: req.user.id, available_to: { has: 'keeper' } },
          ],
        },
        select: { id: true },
      });

      if (!existing) {
        return res.status(404).json({ error: 'DIALOG_NOT_FOUND' });
      }

      await prisma.dialog.delete({ where: { id: dialogId } });

      logger.info({ domainId, dialogId, userId: req.user.id }, '[kip-dialogs] deleted');
      return res.status(204).send();
    } catch (error) {
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] delete failed');
      return res.status(500).json({ error: 'FAILED_TO_DELETE_DIALOG' });
    }
  },
);

// ─── Cast membership (cross-domain lead agents) ───────────────────────────────
// Phase 1: enablement + persistence only. Delegation is a later phase.

router.get(
  '/:domainId/kip/dialogs/:dialogId/cast-candidates',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }
      const candidates = await listDialogCastCandidates({
        userId: req.user.id,
        domainId,
        dialogId,
      });
      return res.json({ candidates });
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code) {
        return res.status(castMembershipErrorStatus(code)).json({ error: code });
      }
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] cast-candidates failed');
      return res.status(500).json({ error: 'FAILED_TO_LIST_CAST_CANDIDATES' });
    }
  },
);

router.get(
  '/:domainId/kip/dialogs/:dialogId/cast-members',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }
      const members = await listDialogCastMembers({
        userId: req.user.id,
        domainId,
        dialogId,
      });
      return res.json({ members });
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code) {
        return res.status(castMembershipErrorStatus(code)).json({ error: code });
      }
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] cast-members list failed');
      return res.status(500).json({ error: 'FAILED_TO_LIST_CAST_MEMBERS' });
    }
  },
);

router.post(
  '/:domainId/kip/dialogs/:dialogId/cast-members',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }
      const parsed = enableCastMemberSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      const member = await enableDialogCastMember({
        userId: req.user.id,
        domainId,
        dialogId,
        homeDomainId: parsed.data.homeDomainId,
      });
      logger.info(
        { domainId, dialogId, homeDomainId: member.homeDomainId, agentSlug: member.agentSlug },
        '[kip-dialogs] cast member enabled',
      );
      return res.status(201).json({ member });
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code) {
        return res.status(castMembershipErrorStatus(code)).json({ error: code });
      }
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] cast-members enable failed');
      return res.status(500).json({ error: 'FAILED_TO_ENABLE_CAST_MEMBER' });
    }
  },
);

router.delete(
  '/:domainId/kip/dialogs/:dialogId/cast-members/:agentId',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId, dialogId, agentId } = req.params;
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }
      await disableDialogCastMember({
        userId: req.user.id,
        domainId,
        dialogId,
        agentId,
      });
      return res.status(204).send();
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code) {
        return res.status(castMembershipErrorStatus(code)).json({ error: code });
      }
      logger.error({ err: error, domainId, dialogId, agentId }, '[kip-dialogs] cast-members delete failed');
      return res.status(500).json({ error: 'FAILED_TO_DISABLE_CAST_MEMBER' });
    }
  },
);

export default router;
