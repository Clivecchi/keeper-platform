/**
 * Guest session handoff keys — POST /api/keys (issue), POST /api/keys/:id/redeem
 * KE3P · Keeper Platform · Phase 1
 */

import express, { type Response } from 'express';
import { prisma } from '@keeper/database';
import { z } from 'zod';
import { logger } from '@keeper/shared';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
const router = express.Router();

const GUEST_DOMAIN_TAG_PREFIX = 'guest-domain:';

function guestDomainTag(domainId: string): string {
  return `${GUEST_DOMAIN_TAG_PREFIX}${domainId}`;
}

function parseTtlMs(): number {
  const mins = process.env.KIP_GUEST_KEY_TTL_MINUTES;
  if (mins && /^\d+$/.test(mins)) {
    return Math.max(1, parseInt(mins, 10)) * 60 * 1000;
  }
  return 7 * 24 * 60 * 60 * 1000;
}

const issueSchema = z.object({
  domain_id: z.string().min(1),
  session_id: z.string().uuid(),
});

router.post('/', async (req: express.Request, res: Response, next: express.NextFunction) => {
  // Provider Key EntityKind creation uses the same path with a `provider` field.
  if (req.body && typeof req.body === 'object' && 'provider' in req.body) {
    return next();
  }

  const parsed = issueSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'INVALID_REQUEST', details: parsed.error.flatten() });
  }

  const { domain_id, session_id } = parsed.data;
  const tag = guestDomainTag(domain_id);

  try {
    const domain = await prisma.domain.findUnique({ where: { id: domain_id }, select: { id: true } });
    if (!domain) {
      return res.status(404).json({ success: false, error: 'DOMAIN_NOT_FOUND' });
    }

    const session = await prisma.kip_sessions.findUnique({
      where: { id: session_id },
      select: { id: true, user_id: true, dialog_id: true, tags: true },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' });
    }

    if (session.user_id !== null) {
      return res.status(400).json({ success: false, error: 'SESSION_NOT_GUEST' });
    }
    if (session.dialog_id !== null) {
      return res.status(400).json({ success: false, error: 'SESSION_ALREADY_DIALOG_LINKED' });
    }
    if (!session.tags.includes(tag)) {
      return res.status(403).json({ success: false, error: 'SESSION_DOMAIN_MISMATCH' });
    }

    const existing = await prisma.sessionHandoffKey.findFirst({
      where: {
        domain_id,
        session_id,
        claimed_by: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { issued_at: 'desc' },
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        key: {
          id: existing.id,
          domain_id: existing.domain_id,
          session_id: existing.session_id,
          issued_at: existing.issued_at,
          expires_at: existing.expires_at,
          claimed_by: existing.claimed_by,
          claimed_at: existing.claimed_at,
        },
      });
    }

    const expiresAt = new Date(Date.now() + parseTtlMs());
    const key = await prisma.sessionHandoffKey.create({
      data: {
        domain_id,
        session_id,
        expires_at: expiresAt,
      },
    });

    logger.info({ domainId: domain_id, sessionId: session_id, keyId: key.id }, '[keys] issued');
    return res.status(201).json({
      success: true,
      key: {
        id: key.id,
        domain_id: key.domain_id,
        session_id: key.session_id,
        issued_at: key.issued_at,
        expires_at: key.expires_at,
        claimed_by: key.claimed_by,
        claimed_at: key.claimed_at,
      },
    });
  } catch (err) {
    logger.error({ err }, '[keys] issue failed');
    return res.status(500).json({ success: false, error: 'FAILED_TO_ISSUE_KEY' });
  }
});

router.post('/:id/redeem', authMiddlewareCompat, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
  }

  try {
    const key = await prisma.sessionHandoffKey.findUnique({
      where: { id },
      include: {
        session: {
          select: {
            id: true,
            user_id: true,
            dialog_id: true,
            session_name: true,
            topic: true,
            kip_messages: { orderBy: { created_at: 'asc' }, take: 1, select: { content: true } },
          },
        },
      },
    });

    if (!key) {
      return res.status(410).json({ success: false, error: 'KEY_NOT_FOUND' });
    }
    if (key.claimed_by) {
      return res.status(409).json({ success: false, error: 'KEY_ALREADY_CLAIMED' });
    }
    if (key.expires_at <= new Date()) {
      return res.status(410).json({ success: false, error: 'KEY_EXPIRED' });
    }

    const sess = key.session;
    if (!sess || sess.user_id !== null) {
      return res.status(400).json({ success: false, error: 'SESSION_INVALID' });
    }

    const firstSnippet = sess.kip_messages[0]?.content?.slice(0, 80)?.trim() ?? '';
    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const titleBase = firstSnippet ? `${firstSnippet}${firstSnippet.length >= 80 ? '…' : ''}` : 'Recovered conversation';
    const title = `${titleBase} · ${dateLabel}`;

    const newDialog = await prisma.dialog.create({
      data: {
        title,
        domain_id: key.domain_id,
        user_id: req.user.id,
        available_to: ['keeper'],
        context: {
          board: 'cover',
          frame: 'guest_companion',
          subject: sess.session_name ?? 'guest',
        },
      },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.kip_sessions.update({
        where: { id: sess.id },
        data: {
          user_id: req.user.id,
          dialog_id: newDialog.id,
        },
      }),
      prisma.sessionHandoffKey.update({
        where: { id: key.id },
        data: {
          claimed_by: req.user.id,
          claimed_at: new Date(),
        },
      }),
    ]);

    const fullDialog = await prisma.dialog.findUnique({
      where: { id: newDialog.id },
      include: {
        sessions: {
          orderBy: { created_at: 'asc' },
          include: { kip_messages: { orderBy: { created_at: 'asc' } } },
        },
      },
    });

    logger.info({ keyId: id, userId: req.user.id, dialogId: newDialog.id }, '[keys] redeemed');
    return res.status(200).json({ success: true, dialog: fullDialog });
  } catch (err) {
    logger.error({ err, keyId: id }, '[keys] redeem failed');
    return res.status(500).json({ success: false, error: 'FAILED_TO_REDEEM' });
  }
});

export default router;
