/**
 * Dialog API Routes
 * =================
 * Persistent, named conversation containers that group kip_sessions.
 *
 * Routes (all nested under /api/domains/:domainId):
 *   POST   /kip/dialogs             — create a new Dialog
 *   GET    /kip/dialogs             — list Dialogs for a domain (filtered by scope)
 *   GET    /kip/dialogs/:dialogId   — get a single Dialog with its sessions
 *   GET    /kip/dialogs/:dialogId/document — Chronicle Document (Forward/Step/Paths + manuscripts)
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
import { logger, parseDocumentPathDeclarations } from '@keeper/shared';
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

const router = Router();

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

const documentStatusSchema = z.enum(['drafts', 'kept', 'presented']);

const documentPathDeclarationSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  prelude: z.string().max(2000).optional(),
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
        is_archived?: boolean;
        document_status?: 'drafts' | 'kept' | 'presented';
        forward_title?: string | null;
        forward_description?: string | null;
        step_title?: string | null;
        step_body?: string | null;
        document_paths?: object | null;
      } = {};
      if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
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
