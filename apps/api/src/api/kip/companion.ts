/**
 * Public Companion Chat Endpoint
 * POST /api/kip/companion
 *
 * Guest-accessible — no auth required.
 * Rate limited: 20 requests per minute per IP.
 *
 * Resolves intelligence through the Model Registry (same as member Agent turns).
 * `frame_json.kip.model` is a preference, not a separate execution path.
 * Persists turns to `kip_sessions` / `kip_messages` (guest user_id = null, no Dialog).
 * Clients call POST /api/keys to obtain a handoff token for login promotion.
 *
 * KE3P · Keeper Platform · March 2026
 */

import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '@keeper/database';
import { executeRegisteredChat } from '../../services/executeRegisteredChat.js';
import type { ModelMessage } from '../../services/ModelProviderService.js';

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

const BoardContextAgentSchema = z.object({
  name: z.string().max(100),
  model: z.string().max(100),
  scope: z.string().max(500),
});

const BoardContextSchema = z.object({
  board: z.string().max(50),
  agents: z.array(BoardContextAgentSchema).max(20).optional(),
});

const ExperienceContextSchema = z
  .object({
    surface: z.enum(["cover", "present"]),
    journeyId: z.string().uuid().optional(),
    journeyName: z.string().max(200).optional(),
  })
  .optional();

const CompanionRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  domainSlug: z.string().min(1).max(100),
  conversationHistory: z
    .array(HistoryItemSchema)
    .max(20)
    .optional()
    .default([]),
  sessionId: z.string().uuid().optional(),
  boardContext: BoardContextSchema.optional(),
  experienceContext: ExperienceContextSchema,
});

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

  const { domainSlug, conversationHistory, sessionId: clientSessionId, boardContext, experienceContext } =
    validation.data;
  const rawMessage = stripHtml(validation.data.message);
  if (!rawMessage) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }

  try {
    let kipModel: string | null = null;
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
          if (typeof kip?.model === 'string' && kip.model.trim()) kipModel = kip.model.trim();
          if (kipCtx?.guest) guestContext = String(kipCtx.guest);
        }
      }
    } catch {
      // proceed with defaults
    }

    // Prepend board context when the caller identifies the surface
    if (boardContext) {
      const agentLines = (boardContext.agents ?? [])
        .map((a) => `- ${a.name} (${a.model}) — ${a.scope}`)
        .join('\n');
      const contextBlock = [
        `You are operating on the ${boardContext.board === 'agent' ? 'Agent Board' : boardContext.board} of the Keeper platform.`,
        `Domain: ${domainSlug}`,
        agentLines
          ? `Registered agents on this domain:\n${agentLines}`
          : 'No agents are registered on this domain yet.',
        ``,
        `Your role here: help the domain owner understand, configure, and direct their agents. You know these agents. You don't need to ask what platform this is.`,
      ].join('\n');
      guestContext = `${contextBlock}\n\n${guestContext}`;
    }

    if (experienceContext) {
      if (experienceContext.surface === 'present') {
        const journeyLine = experienceContext.journeyName
          ? `They are reading the public journey "${experienceContext.journeyName}".`
          : 'They are reading a public journey story on Present.';
        guestContext = [
          `You are the visitor's travel diary companion — warm, personal, and brief.`,
          journeyLine,
          `Help them reflect on what they read, ask gentle questions, and note what stays with them.`,
          `Do not ask them to configure the platform or use admin language.`,
          ``,
          guestContext,
        ].join('\n');
      } else if (experienceContext.surface === 'cover') {
        guestContext = [
          `You are greeting a visitor at the domain cover — the threshold before the story.`,
          `Orient them: Forward opens the featured journey; they can browse other public journeys.`,
          `Keep replies short. Invite them into the story without overwhelming.`,
          ``,
          guestContext,
        ].join('\n');
      }
    }

    const priorTurns: ModelMessage[] = conversationHistory.slice(-6).map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const messages: ModelMessage[] = [
      { role: 'system', content: guestContext },
      ...priorTurns,
      { role: 'user', content: rawMessage },
    ];

    const executed = await executeRegisteredChat({
      preference: {
        provider: 'anthropic',
        model: kipModel,
        source: kipModel ? 'companion_frame' : 'default',
      },
      messages,
      settings: {
        model: kipModel ?? 'claude-sonnet-5',
        max_tokens: 1024,
        temperature: 0.7,
      },
      userId: domainOwnerId ?? undefined,
      domainId: domainId ?? undefined,
    });

    if (!executed.response.success) {
      console.error('[kip/companion] ExecutionPlan failed', executed.record);
      return res.status(500).json({ success: false, error: 'Something went wrong.' });
    }

    let reply = executed.response.content.trim();
    if (!reply) reply = 'I appreciate your message.';
    const executionMeta = {
      offeringId: executed.record.offeringId,
      provider: executed.record.provider,
      model: executed.record.model,
      fallbackUsed: executed.record.fallbackUsed,
      preferenceModel: executed.record.preferenceModel,
      preferenceProvider: executed.record.preferenceProvider,
      attempts: executed.record.attempts,
    };

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
                metadata: { execution: executionMeta },
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
