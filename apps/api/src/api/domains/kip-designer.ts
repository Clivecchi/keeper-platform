/**
 * Kip Designer Conversation Endpoint
 * POST /api/domains/:domainId/kip/designer
 *
 * Two-model pattern:
 *   Anthropic (claude-sonnet-4-6) — conversation, brief confirmation of what changed
 *   Together AI (meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo, JSON Mode + schema)
 *     — schema-constrained domain JSON output via response_format
 *
 * Fallback: if TOGETHER_API_KEY is not configured, a second Anthropic call
 * produces the JSON block directly, so the loop always completes.
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

// ─── Together AI JSON Mode call ───────────────────────────────────────────────

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

// ─── Anthropic JSON fallback ──────────────────────────────────────────────────
// Used when TOGETHER_API_KEY is not configured or Together AI call fails.
// Instructs Anthropic to return a raw JSON object only — no prose, no fences.

async function callAnthropicJsonFallback(
  existingJson: object | null,
  frameKey: string,
  domainSlug: string,
  authoringIntent: string,
  conversationContext: string,
  apiKey: string,
): Promise<unknown> {
  logger.info('[designer] Calling Anthropic JSON fallback');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const systemPrompt = [
    `You are authoring the \`${frameKey}\` frame JSON block for the Keeper domain "${domainSlug}".`,
    ``,
    `Current \`${frameKey}\` content:`,
    existingJson ? JSON.stringify(existingJson, null, 2) : '{}',
    ``,
    `Authoring intent: ${authoringIntent}`,
    conversationContext ? `\nContext from Kip: ${conversationContext}` : '',
    ``,
    `IMPORTANT: Respond ONLY with a valid JSON object — no explanation, no markdown, no code fences.`,
    `Preserve all existing fields. Update only what was requested.`,
    `All string values must be meaningful, brand-appropriate content for this domain.`,
  ].join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    temperature: 0.2,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Produce the updated \`${frameKey}\` frame JSON object.` }],
  } as any);

  const text = ((response as any).content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text ?? '')
    .join('');

  // Strip any accidental markdown fences
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  try {
    return JSON.parse(stripped);
  } catch {
    throw new Error('Anthropic JSON fallback returned non-JSON content');
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

      // ── Look up frame schema ──
      const frameSchema = FRAME_SCHEMA_MAP[frameKey] ?? null;

      // ── Decide whether to generate a JSON proposal ──
      // Produce JSON when: authoring intent detected AND frame has a schema.
      // Together AI is preferred (schema-constrained); Anthropic is the fallback.
      const needsJson = wantsJsonProposal(message) && frameSchema !== null;

      let draftSpecJson: unknown | null = null;

      if (needsJson) {
        const togetherSystemPrompt = [
          `You are authoring the \`${frameKey}\` frame JSON block for the Keeper domain "${domain.slug}".`,
          `Your output must strictly match the provided JSON schema — every required field must be present, no extra keys allowed.`,
          ``,
          `All string values must be meaningful, brand-appropriate content for this domain. Do not use placeholder text.`,
          ``,
          `Current \`${frameKey}\` content:`,
          currentFrameBlock ? JSON.stringify(currentFrameBlock, null, 2) : '{}',
          ``,
          `Authoring intent: ${message}`,
          ``,
          `Proposed approach from Kip: ${kipResponse}`,
          ``,
          `Produce the complete updated \`${frameKey}\` JSON object. Preserve all existing fields; update only what was requested.`,
        ].join('\n');

        const togetherUserPrompt = `Produce the updated \`${frameKey}\` frame JSON object.`;

        if (togetherKey) {
          try {
            draftSpecJson = await callTogetherJsonMode(
              togetherSystemPrompt,
              togetherUserPrompt,
              frameSchema,
              togetherKey,
            );
            logger.info({ requestId, domainId, frameKey }, '[designer] Together AI JSON mode produced draft');
          } catch (togetherErr) {
            logger.warn({ requestId, domainId, err: togetherErr }, '[designer] Together AI failed, falling back to Anthropic JSON');
          }
        }

        // Anthropic JSON fallback — runs if Together AI is unavailable or failed
        if (draftSpecJson === null) {
          try {
            draftSpecJson = await callAnthropicJsonFallback(
              currentFrameBlock,
              frameKey,
              domain.slug,
              message,
              kipResponse,
              anthropicKey,
            );
            logger.info({ requestId, domainId, frameKey }, '[designer] Anthropic JSON fallback produced draft');
          } catch (fallbackErr) {
            logger.warn({ requestId, domainId, err: fallbackErr }, '[designer] Anthropic JSON fallback failed, returning conversation only');
          }
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
