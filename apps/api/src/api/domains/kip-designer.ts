/**
 * Kip Designer Conversation Endpoint
 * POST /api/domains/:domainId/kip/designer
 *
 * Two-model pattern:
 *   Anthropic (claude-sonnet-4-6) — conversation, reasoning, brand voice
 *   Together AI (meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo, JSON Mode + schema)
 *     — guaranteed schema-compliant domain JSON output via response_format with frame schema
 *
 * Model selection rationale:
 *   meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo — fast, cost-efficient, supports
 *   Together AI guided decoding (response_format with JSON Schema). Selected over
 *   Mixtral-8x7B (schema-less only) and Mixtral-8x22B (heavier, higher latency).
 *
 * Request:  { message, frameKey, conversationHistory }
 * Response: { response: string, draft?: { spec_json: object } }
 *
 * Auth: authenticated + domain write access (same guard as publish handler).
 *
 * KE3P · Keeper Platform · Phase 1 · March 2026
 */

import { Router, type Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { z } from 'zod';
import { logger } from '@keeper/shared';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';
import { FRAME_SCHEMA_MAP } from './frame-schemas.js';

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
});

// ─── Intent detection ─────────────────────────────────────────────────────────
// Determines if the user's message is asking for a JSON proposal.

const JSON_INTENT_PATTERNS = [
  /update\b/i, /change\b/i, /revise\b/i, /modify\b/i, /generate\b/i,
  /write\b/i, /create\b/i, /make\b/i, /set\b/i, /rework\b/i, /rewrite\b/i,
  /propose\b/i, /draft\b/i, /suggest\b/i, /produce\b/i, /build\b/i,
];

function wantsJsonProposal(message: string): boolean {
  return JSON_INTENT_PATTERNS.some((re) => re.test(message));
}

// ─── Anthropic call ───────────────────────────────────────────────────────────

async function callAnthropic(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
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

// ─── Together AI JSON Mode call ───────────────────────────────────────────────
// Model: meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
// Supports Together AI guided decoding via response_format with JSON Schema.
// The schema parameter is required — this function is only called when a schema exists.

async function callTogetherJsonMode(
  systemPrompt: string,
  userPrompt: string,
  schema: object,
  apiKey: string,
): Promise<unknown> {
  logger.info('[designer] Calling Together AI JSON mode with schema');

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object', schema },
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Together AI error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Together AI returned no content');

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Together AI returned non-JSON content');
  }
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

      const { message, frameKey, conversationHistory } = parsed.data;

      // ── Fetch domain + live frame_json ──
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: { id: true, slug: true, frame_json: true },
      });

      if (!domain) {
        return res.status(404).json({ error: 'DOMAIN_NOT_FOUND' });
      }

      const liveFrameJson = domain.frame_json ?? {};
      const currentFrameBlock = (liveFrameJson as any)[frameKey] ?? null;

      // ── Resolve API keys ──
      const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() || null;
      const togetherKey = process.env.TOGETHER_API_KEY?.trim() || null;

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

      // ── System prompt for Anthropic ──
      const kipSystemPrompt = [
        `You are Kip, the Keeper platform's Experience Director in Designer mode.`,
        `You are helping a domain owner shape the "${frameKey}" frame for the domain "${domain.slug}".`,
        ``,
        `The current live content for the "${frameKey}" frame:`,
        currentFrameBlock
          ? JSON.stringify(currentFrameBlock, null, 2)
          : '(no content yet — this frame block is empty)',
        ``,
        `Your role:`,
        `- Understand what the owner wants to change`,
        `- Discuss options, offer creative direction, ask clarifying questions if needed`,
        `- When you have a clear proposal ready, tell the owner you're ready to produce the updated JSON`,
        `- Keep responses conversational and concise (2-4 sentences unless exploring ideas)`,
        `- Do NOT output raw JSON in this response — that happens in the structured step`,
      ].join('\n');

      // ── Anthropic call (conversation) ──
      logger.info({ requestId, domainId, frameKey, userId: req.user.id }, '[designer] Anthropic call');
      const kipResponse = await callAnthropic(kipSystemPrompt, anthropicMessages, anthropicKey);

      // ── Look up frame schema — null means no JSON governance for this frame ──
      const frameSchema = FRAME_SCHEMA_MAP[frameKey] ?? null;

      // ── Decide if Together AI JSON mode is needed ──
      // Requires: authoring intent detected + Together AI key configured + frame has a schema
      const needsJson = wantsJsonProposal(message) && togetherKey && frameSchema !== null;

      let draftSpecJson: unknown | null = null;

      if (needsJson) {
        // ── Together AI JSON Mode call (schema-guaranteed output) ──
        const togetherSystemPrompt = [
          `You are authoring the \`${frameKey}\` frame JSON block for the Keeper domain "${domain.slug}".`,
          `Your output must strictly match the provided JSON schema — every required field must be present, no extra keys allowed.`,
          ``,
          `All string values must be meaningful, brand-appropriate content for this domain. Do not use placeholder text.`,
          ``,
          `Current \`${frameKey}\` content:`,
          currentFrameBlock
            ? JSON.stringify(currentFrameBlock, null, 2)
            : '{}',
          ``,
          `Authoring intent: ${message}`,
          ``,
          `Proposed approach from Kip: ${kipResponse}`,
          ``,
          `Produce the complete updated \`${frameKey}\` JSON object. Preserve all existing fields; update only what was requested.`,
        ].join('\n');

        const togetherUserPrompt = `Produce the updated \`${frameKey}\` frame JSON object.`;

        try {
          const rawJson = await callTogetherJsonMode(
            togetherSystemPrompt,
            togetherUserPrompt,
            frameSchema,
            togetherKey!,
          );
          draftSpecJson = rawJson;
          logger.info({ requestId, domainId, frameKey }, '[designer] Together AI JSON mode produced draft');
        } catch (jsonErr) {
          // JSON generation failed — conversation continues normally without a draft proposal
          logger.warn({ requestId, domainId, err: jsonErr }, '[designer] Together AI JSON mode failed, returning conversation only');
        }
      }

      return res.status(200).json({
        response: kipResponse,
        ...(draftSpecJson !== null ? { draft: { spec_json: draftSpecJson } } : {}),
      });
    } catch (error) {
      logger.error({ requestId, domainId: req.params.domainId, err: error }, '[designer] handler failed');
      return res.status(500).json({ error: 'DESIGNER_FAILED', code: 'INTERNAL_ERROR' });
    }
  },
);

export default router;
