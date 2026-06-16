/**
 * Kip Designer Conversation Endpoint
 * POST /api/domains/:domainId/kip/designer
 *
 * Two-model pattern:
 *   Anthropic (claude-sonnet-4-6) — conversation, brief confirmation of what changed
 *   Structure service (Together JSON + schema, Anthropic fallback) — domain.frame.* contracts
 *
 * Request:  { message, frameKey, conversationHistory }
 * Response: { response: string, draft?: { spec_json: object } }
 *
 * Auth: authenticated + domain write access.
 *
 * KE3P · Keeper Platform · Phase 1 · March 2026
 */

import { Router, type Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { z } from 'zod';
import { logger } from '@keeper/shared';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';
import { getFrameSliceFromDomainFrame } from '@keeper/shared';
import { findOrCreateKipDialog } from '../../services/kipDialogLifecycle.js';
import {
  getDomainFrameStructureContractId,
  hasDomainFrameStructureContract,
} from '../../services/structure/contracts.js';
import { generateDomainFrameSlice } from '../../services/structure/generateDomainFrameSlice.js';

const prisma = new PrismaClient();
const router = Router();

// ─── Request schema ───────────────────────────────────────────────────────────

const conversationMessageSchema = z.object({
  role: z.enum(['user', 'kip']),
  content: z.string(),
});

const designerRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  frameKey: z.string().min(1).max(100),
  conversationHistory: z.array(conversationMessageSchema).max(50).optional().default([]),
  // Optional — provided by the frontend after the first message to associate
  // subsequent messages with the same Dialog. On the first message it is null
  // and the backend finds-or-creates the Dialog automatically.
  dialog_id: z.string().optional().nullable(),
  /** Dialog context board slug — drives title format and resolve/active matching. Default `domain`. */
  dialog_board: z.enum(['domain', 'designer']).optional().default('domain'),
});

// ─── Intent detection ─────────────────────────────────────────────────────────
// Returns true for any authoring intent.
// Returns false only for pure informational questions.

const PURE_QUESTION_PATTERN = /^\s*(what\b|why\b|how\b|when\b|who\b|which\b|where\b|is\b|are\b|do\b|does\b|did\b|can you explain|tell me|explain\b)/i;

function wantsJsonProposal(message: string): boolean {
  return !PURE_QUESTION_PATTERN.test(message);
}

// ─── Anthropic call (conversational) ─────────────────────────────────────────

async function callAnthropic(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    temperature: 0.7,
    system: systemPrompt,
    messages,
  } as any);

  const blocks = (response as any).content ?? [];
  return blocks
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text ?? '')
    .join('');
}

// ─── Route ────────────────────────────────────────────────────────────────────

// ─── Dialog + session persistence helpers ────────────────────────────────────

/**
 * Find the most recent kip_session for a Dialog, or create a new one.
 * Uses the "kip" platform agent as the session agent.
 */
async function findOrCreateDesignerSession(dialogId: string, userId: string): Promise<{ id: string }> {
  const existing = await prisma.kip_sessions.findFirst({
    where: { dialog_id: dialogId },
    orderBy: { created_at: 'desc' },
    select: { id: true },
  });

  if (existing) return existing;

  const kipAgent = await prisma.kip_agents.findFirst({
    where: { slug: 'kip' },
    select: { id: true },
  });

  if (!kipAgent) {
    throw new Error('kip agent not found — cannot create designer session');
  }

  const session = await prisma.kip_sessions.create({
    data: {
      agent_id: kipAgent.id,
      user_id: userId,
      session_name: 'designer',
      dialog_id: dialogId,
    },
    select: { id: true },
  });

  return session;
}

/**
 * Persist a user + assistant message pair to kip_messages for a session.
 */
async function persistDesignerMessages(
  sessionId: string,
  userMessage: string,
  kipResponse: string,
): Promise<void> {
  await prisma.kip_messages.createMany({
    data: [
      {
        session_id: sessionId,
        sender: 'user',
        content: userMessage,
        role: 'user',
        metadata: {},
      },
      {
        session_id: sessionId,
        sender: 'kip',
        content: kipResponse,
        role: 'assistant',
        metadata: {},
      },
    ],
  });

  // Touch the session's updated_at
  await prisma.kip_sessions.update({
    where: { id: sessionId },
    data: { updated_at: new Date() },
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post(
  '/:domainId/kip/designer',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = (req.headers['x-request-id'] || req.headers['x-railway-request-id'] || 'unknown') as string;
    const { domainId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const parsed = designerRequestSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const {
        message,
        frameKey,
        conversationHistory,
        dialog_id: clientDialogId,
        dialog_board: dialogBoard,
      } = parsed.data;

      // ── Fetch domain + live frame_json ──
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: { id: true, slug: true, frame_json: true },
      });

      if (!domain) {
        return res.status(404).json({ error: 'DOMAIN_NOT_FOUND' });
      }

      const liveFrameJson = (domain.frame_json ?? {}) as Record<string, unknown>;
      const currentFrameBlock = getFrameSliceFromDomainFrame(liveFrameJson, frameKey);

      // ── Resolve API keys ──
      const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() || null;

      if (!anthropicKey) {
        return res.status(503).json({
          error: 'MISSING_API_KEY',
          message: 'ANTHROPIC_API_KEY is not configured.',
        });
      }

      // ── Build conversation history for Anthropic ──
      const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (const msg of conversationHistory) {
        anthropicMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
      anthropicMessages.push({ role: 'user', content: message });

      // ── System prompt for Anthropic (conversational confirmation) ──
      const kipSystemPrompt = [
        `You are Kip, the Keeper platform's Experience Director in Designer mode.`,
        `You are helping a domain owner shape the "${frameKey}" frame for the domain "${domain.slug}".`,
        ``,
        `Current "${frameKey}" frame content:`,
        currentFrameBlock
          ? JSON.stringify(currentFrameBlock, null, 2)
          : '(empty — no content for this frame yet)',
        ``,
        `Instructions:`,
        `- When the owner asks for a change, immediately confirm in 1-2 sentences what you are updating and why it improves the experience.`,
        `- Do NOT ask clarifying questions before acting — make the best interpretation of their request and explain your choice briefly.`,
        `- Do NOT output raw JSON — a complete updated JSON proposal is generated automatically from your description.`,
        `- If the owner is asking a pure informational question (not requesting a change), answer it concisely in 2-3 sentences.`,
      ].join('\n');

      // ── Anthropic call (conversational confirmation) ──
      logger.info({ requestId, domainId, frameKey, userId: req.user.id }, '[designer] Anthropic conversation call');
      const kipResponse = await callAnthropic(kipSystemPrompt, anthropicMessages, anthropicKey);

      const frameContractId = getDomainFrameStructureContractId(frameKey);
      const needsJson = wantsJsonProposal(message) && hasDomainFrameStructureContract(frameKey);

      let draftSpecJson: unknown | null = null;

      if (needsJson && frameContractId) {
        const generated = await generateDomainFrameSlice({
          contractId: frameContractId,
          frameKey,
          domainSlug: domain.slug,
          authoringIntent: message,
          conversationContext: kipResponse,
          currentSlice: currentFrameBlock,
          userId: req.user.id,
          requestId,
          anthropicApiKey: anthropicKey,
        });
        if (generated.ok && generated.data !== null) {
          draftSpecJson = generated.data;
          logger.info(
            { requestId, domainId, frameKey, source: generated.source },
            '[designer] structure service produced frame draft',
          );
        } else {
          logger.warn({ requestId, domainId, frameKey }, '[designer] structure service returned no draft');
        }
      }

      // ── Persist Dialog + session + messages ──────────────────────────────────
      // Only for authenticated users. Guest conversations (no req.user) must
      // never create Dialog records — they are ephemeral by design.
      let persistedDialogId: string | null = null;
      let persistedSessionId: string | null = null;

      try {
        // Guard: never persist a Dialog for unauthenticated requests.
        // req.user is guaranteed by authMiddlewareCompat above, but this
        // explicit check ensures Dialog creation is never reached for guests.
        if (!req.user) throw new Error('unauthenticated — skip dialog persistence');

        let dialog: { id: string };
        if (clientDialogId) {
          const verified = await prisma.dialog.findFirst({
            where: {
              id: clientDialogId,
              domain_id: domainId,
              user_id: null,
              available_to: { equals: ['admin'] },
            },
            select: { id: true },
          });
          if (!verified) {
            dialog = await findOrCreateKipDialog(prisma, {
              domainId,
              board: dialogBoard,
              frame: frameKey,
              subject: domain.slug,
              scope: 'admin',
              userId: null,
            });
          } else {
            dialog = verified;
          }
        } else {
          dialog = await findOrCreateKipDialog(prisma, {
            domainId,
            board: dialogBoard,
            frame: frameKey,
            subject: domain.slug,
            scope: 'admin',
            userId: null,
          });
        }

        const session = await findOrCreateDesignerSession(dialog.id, req.user.id);
        await persistDesignerMessages(session.id, message, kipResponse);

        // Touch the dialog so it sorts to the top on subsequent listing
        await prisma.dialog.update({
          where: { id: dialog.id },
          data: { updated_at: new Date() },
        });

        persistedDialogId = dialog.id;
        persistedSessionId = session.id;
      } catch (persistErr) {
        // Persistence failure must not block the Kip response — log and continue.
        // The conversation is still functional; only resumption will be affected.
        logger.warn({ requestId, domainId, frameKey, err: persistErr }, '[designer] dialog persistence failed — response unaffected');
      }

      return res.status(200).json({
        response: kipResponse,
        ...(draftSpecJson !== null ? { draft: { spec_json: draftSpecJson } } : {}),
        ...(persistedDialogId ? { dialog_id: persistedDialogId } : {}),
        ...(persistedSessionId ? { session_id: persistedSessionId } : {}),
      });
    } catch (error) {
      logger.error({ requestId, domainId: req.params.domainId, err: error }, '[designer] handler failed');
      return res.status(500).json({ error: 'DESIGNER_FAILED', code: 'INTERNAL_ERROR' });
    }
  },
);

export default router;
