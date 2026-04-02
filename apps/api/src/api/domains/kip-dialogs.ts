/**
 * Dialog API Routes
 * =================
 * Persistent, named conversation containers that group kip_sessions.
 *
 * Routes (all nested under /api/domains/:domainId):
 *   POST   /kip/dialogs             — create a new Dialog
 *   GET    /kip/dialogs             — list Dialogs for a domain (filtered by scope)
 *   GET    /kip/dialogs/:dialogId   — get a single Dialog with its sessions
 *   PATCH  /kip/dialogs/:dialogId   — update title or archive
 *
 * Audience scoping:
 *   available_to: ["admin"]   — domain-level; user_id is null
 *   available_to: ["keeper"]  — per-user; user_id populated from auth session
 *   Guest conversations are ephemeral (Session only) and never create a Dialog.
 *
 * KE3P · Keeper Platform · April 2026
 */

import { Router, type Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { z } from 'zod';
import { logger } from '@keeper/shared';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';

const prisma = new PrismaClient();
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

const updateDialogSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  is_archived: z.boolean().optional(),
});

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
              kip_messages: {
                orderBy: { created_at: 'asc' },
              },
            },
          },
        },
      });

      if (!dialog) {
        return res.status(404).json({ error: 'DIALOG_NOT_FOUND' });
      }

      return res.json({ dialog });
    } catch (error) {
      logger.error({ err: error, domainId, dialogId }, '[kip-dialogs] get failed');
      return res.status(500).json({ error: 'FAILED_TO_GET_DIALOG' });
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

      const updateData: { title?: string; is_archived?: boolean } = {};
      if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
      if (parsed.data.is_archived !== undefined) updateData.is_archived = parsed.data.is_archived;

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

// ─── GET /api/domains/:domainId/kip/dialogs/active ───────────────────────────
// Resolve the active (most recent non-archived) Dialog for a given context.
// Query params: board, frame, available_to
// Used by the Design Board on mount to resume the previous conversation.
// Returns null (not 404) when no active Dialog exists for the context.

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

      const dialog = await prisma.dialog.findFirst({
        where: {
          domain_id: domainId,
          is_archived: false,
          ...(scope === 'keeper'
            ? { user_id: req.user.id, available_to: { has: 'keeper' } }
            : { available_to: { has: 'admin' } }),
        },
        include: {
          sessions: {
            orderBy: { created_at: 'asc' },
            include: {
              kip_messages: {
                orderBy: { created_at: 'asc' },
              },
            },
          },
        },
        orderBy: { updated_at: 'desc' },
      });

      // Filter by context (board + frame) — stored as JSON in the context field
      const matched = dialog
        ? (() => {
            const ctx = dialog.context as Record<string, unknown>;
            const boardMatch = !board || ctx.board === board;
            const frameMatch = !frame || ctx.frame === frame;
            return boardMatch && frameMatch ? dialog : null;
          })()
        : null;

      return res.json({ dialog: matched });
    } catch (error) {
      logger.error({ err: error, domainId }, '[kip-dialogs] resolve active failed');
      return res.status(500).json({ error: 'FAILED_TO_RESOLVE_DIALOG' });
    }
  },
);

export default router;
