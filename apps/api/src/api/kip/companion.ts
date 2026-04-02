/**
 * Public Companion Chat Endpoint
 * POST /api/kip/companion
 *
 * Guest-accessible — no auth required.
 * Rate limited: 20 requests per minute per IP.
 *
 * Makes a direct Anthropic call using domain frame JSON for system prompt + model.
 * Persists turns to `kip_sessions` / `kip_messages` (guest user_id = null, no Dialog).
 * Clients call POST /api/keys to obtain a handoff token for login promotion.
 *
 * KE3P · Keeper Platform · March 2026
 */

import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '@keeper/database';
import { KipUserKeyService } from '../../services/KipUserKeyService.js';
import { PlatformApiKeyService } from '../../services/PlatformApiKeyService.js';

const router = express.Router();

const companionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Try again shortly.',
    });
  },
});

const HistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
});

const CompanionRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  domainSlug: z.string().min(1).max(100),
  conversationHistory: z
    .array(HistoryItemSchema)
    .max(20)
    .optional()
    .default([]),
  sessionId: z.string().uuid().optional(),
});

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_CONTEXT = 'A visitor exploring Keeper for the first time. Warm welcome. Offer Forward.';

function guestDomainTag(domainId: string): string {
  return `guest-domain:${domainId}`;
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .trim();
}

router.post('/', companionLimiter, async (req: Request, res: Response) => {
  const validation = CompanionRequestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, error: 'Invalid request.' });
  }

  const { domainSlug, conversationHistory, sessionId: clientSessionId } = validation.data;
  const rawMessage = stripHtml(validation.data.message);
  if (!rawMessage) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }

  try {
    let kipModel = DEFAULT_MODEL;
    let guestContext = DEFAULT_CONTEXT;
    let domainOwnerId: string | null = null;
    let domainId: string | null = null;

    try {
      const domain = await prisma.domain.findUnique({
        where: { slug: domainSlug },
        select: { id: true, frame_json: true, ownerId: true },
      });

      if (domain) {
        domainId = domain.id;
        domainOwnerId = domain.ownerId ?? null;
        const frame = domain.frame_json as Record<string, unknown> | null;

        if (frame && typeof frame === 'object' && Object.keys(frame).length > 0) {
          const kip = frame.kip as Record<string, unknown> | undefined;
          const kipCtx = frame.kip_context as Record<string, unknown> | undefined;
          if (kip?.model) kipModel = String(kip.model);
          if (kipCtx?.guest) guestContext = String(kipCtx.guest);
        }
      }
    } catch {
      // proceed with defaults
    }

    let apiKey: string | null = null;

    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey?.trim()) {
      apiKey = envKey.trim();
    }

    if (!apiKey && domainOwnerId) {
      apiKey = await KipUserKeyService.getUserKey('anthropic', domainOwnerId);
    }

    if (!apiKey) {
      apiKey = await PlatformApiKeyService.getKeyForProvider('anthropic');
    }

    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Something went wrong.' });
    }

    const priorTurns = conversationHistory.slice(-6).map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const MODEL_TIMEOUT_MS = 30_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

    let reply: string;
    try {
      const response = await client.messages.create(
        {
          model: kipModel,
          max_tokens: 1024,
          system: guestContext,
          messages: [...priorTurns, { role: 'user', content: rawMessage }],
        } as any,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);

      const blocks = (response as any).content ?? [];
      reply = blocks
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text ?? '')
        .join('')
        .trim();

      if (!reply) reply = 'I appreciate your message.';
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }

    let persistedSessionId: string | undefined;
    try {
      if (domainId) {
        const kipAgent = await prisma.kip_agents.findFirst({
          where: { slug: 'kip' },
          select: { id: true },
        });

        if (kipAgent) {
          const tag = guestDomainTag(domainId);
          let sessionId = clientSessionId ?? null;

          if (sessionId) {
            const existing = await prisma.kip_sessions.findUnique({
              where: { id: sessionId },
              select: { id: true, user_id: true, dialog_id: true, tags: true, agent_id: true },
            });
            if (
              !existing ||
              existing.user_id !== null ||
              existing.dialog_id !== null ||
              existing.agent_id !== kipAgent.id ||
              !existing.tags.includes(tag)
            ) {
              sessionId = null;
            }
          }

          if (!sessionId) {
            const created = await prisma.kip_sessions.create({
              data: {
                agent_id: kipAgent.id,
                user_id: null,
                session_name: 'cover-companion',
                tags: [tag, 'guest-companion'],
                dialog_id: null,
                updated_at: new Date(),
              },
              select: { id: true },
            });
            sessionId = created.id;
          }

          await prisma.kip_messages.createMany({
            data: [
              {
                session_id: sessionId,
                sender: 'user',
                content: rawMessage,
                role: 'user',
                metadata: {},
              },
              {
                session_id: sessionId,
                sender: 'kip',
                content: reply,
                role: 'assistant',
                metadata: {},
              },
            ],
          });

          await prisma.kip_sessions.update({
            where: { id: sessionId },
            data: { updated_at: new Date() },
          });

          persistedSessionId = sessionId;
        }
      }
    } catch {
      // Persistence failure must not block the conversational reply
    }

    return res.json({
      success: true,
      reply,
      ...(persistedSessionId ? { sessionId: persistedSessionId } : {}),
      ...(domainId ? { domainId } : {}),
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Something went wrong.' });
  }
});

export default router;
