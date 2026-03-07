/**
 * Public Companion Chat Endpoint
 * POST /api/kip/companion
 *
 * Guest-accessible — no auth required.
 * Rate limited: 20 requests per minute per IP.
 *
 * Makes a direct Anthropic call using:
 *   - kip_context.guest from the domain frame as the system prompt
 *   - kip.model from the domain frame as the model
 *   - conversationHistory (last 6 prior turns) for context continuity
 *
 * No SOLE memory, no governance, no action packs.
 *
 * API key resolution priority:
 *   1. ANTHROPIC_API_KEY Railway env var
 *   2. Domain owner's personal Anthropic key (kip_user_keys)
 *   3. Platform DB key (kip_platform_keys)
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

// ─── Rate limiter ─────────────────────────────────────────────────────────────

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

// ─── Input schema ─────────────────────────────────────────────────────────────

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
});

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_MODEL   = 'claude-sonnet-4-6';
const DEFAULT_CONTEXT = 'A visitor exploring Keeper for the first time. Warm welcome. Offer Forward.';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .trim();
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/', companionLimiter, async (req: Request, res: Response) => {
  const validation = CompanionRequestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, error: 'Invalid request.' });
  }

  const { domainSlug, conversationHistory } = validation.data;
  const rawMessage = stripHtml(validation.data.message);
  if (!rawMessage) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }

  try {
    // 1. Fetch domain frame — same DB query as GET /api/domains/:slug/frame
    let kipModel     = DEFAULT_MODEL;
    let guestContext = DEFAULT_CONTEXT;
    let domainOwnerId: string | null = null;

    try {
      const domain = await prisma.domain.findUnique({
        where:  { slug: domainSlug },
        select: { frame_json: true, ownerId: true },
      });

      if (domain) {
        domainOwnerId = (domain as any).ownerId ?? null;
        const frame = domain.frame_json as Record<string, any> | null;

        if (frame && typeof frame === 'object' && Object.keys(frame).length > 0) {
          if (frame.kip?.model)         kipModel     = String(frame.kip.model);
          if (frame.kip_context?.guest) guestContext = String(frame.kip_context.guest);
        }
      }
    } catch {
      // DB failure — proceed with defaults; do not block the visitor
    }

    // 2. Resolve Anthropic API key
    //    Priority: Railway env var → domain owner's user key → platform DB key
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

    // 3. Build message list — up to last 6 prior turns + current message
    const priorTurns = conversationHistory.slice(-6).map(h => ({
      role:    h.role as 'user' | 'assistant',
      content: h.content,
    }));

    // 4. Call Anthropic directly
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const MODEL_TIMEOUT_MS = 30_000;
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

    let reply: string;
    try {
      const response = await client.messages.create(
        {
          model:      kipModel,
          max_tokens: 1024,
          system:     guestContext,
          messages: [
            ...priorTurns,
            { role: 'user', content: rawMessage },
          ],
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

    return res.json({ success: true, reply });

  } catch {
    return res.status(500).json({ success: false, error: 'Something went wrong.' });
  }
});

export default router;
