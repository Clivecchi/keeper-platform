/**
 * Cheap Cast offer. One purpose line, the human line, and the trail.
 * The model comes from the cast_offer offering role, not from a call-site model name.
 */
import { resolvePurposeOffering } from '../config/modelRegistry.js';
import { executeRegisteredChat } from './executeRegisteredChat.js';

export type CastOfferResult = {
  slug: string;
  offer: string;
  offeringId: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number | null;
};

function parseOfferText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed) as { offer?: unknown };
    if (typeof parsed.offer === 'string') return parsed.offer.trim();
  } catch {
    const match = trimmed.match(/"offer"\s*:\s*"([^"]*)"/);
    if (match) return match[1]?.trim() ?? '';
  }
  return '';
}

export async function runCastOffer(params: {
  slug: string;
  label: string;
  userMessage: string;
  trail: string;
  userId?: string;
  domainId?: string;
}): Promise<CastOfferResult> {
  const offering = resolvePurposeOffering('cast_offer');
  if (!offering) {
    throw new Error('No offering is configured for cast_offer');
  }
  const human = params.userMessage.trim().slice(0, 500);
  const started = Date.now();
  const executed = await executeRegisteredChat({
    preference: {
      provider: offering.provider,
      model: offering.modelId,
      source: 'agent_preference',
    },
    userId: params.userId,
    domainId: params.domainId,
    messages: [
      {
        role: 'system',
        content: [
          `You are ${params.label}. One job: say whether you have something to add.`,
          'Reply with JSON only: {"offer":"<one sentence>"} or {"offer":""} to stay silent.',
          'Do not perform the full answer. Silence is valid.',
        ].join(' '),
      },
      {
        role: 'user',
        content: `Human: "${human}"\n\nTrail:\n${params.trail || '(no trail yet)'}`,
      },
    ],
    settings: {
      model: offering.modelId,
      temperature: 0,
      max_tokens: 120,
    },
    purpose: 'cast_offer',
    caller: { kind: 'feature', slug: params.slug },
    fallbackPolicy: 'none',
    offeringSelection: 'stated',
  });
  if (!executed.response.success) {
    throw new Error(executed.response.error || 'Cast offer failed');
  }
  const latencyMs = executed.record.latencyMs ?? Date.now() - started;
  const content = executed.response.content ?? '';
  return {
    slug: params.slug,
    offer: parseOfferText(content),
    offeringId: executed.record.offeringId || offering.offeringId,
    promptTokens: executed.record.usage?.promptTokens ?? null,
    completionTokens: executed.record.usage?.completionTokens ?? null,
    latencyMs,
  };
}
