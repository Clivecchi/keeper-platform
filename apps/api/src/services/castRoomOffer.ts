/**
 * Cheap Cast offer. One purpose line, the human line, and the trail.
 * The model comes from the cast_offer offering role, not from a call-site model name.
 */
import { prisma } from '@keeper/database';
import { platformAgencyCore, resolveAgencyCore, type AgencyCoreV1 } from '@keeper/shared';
import { resolvePurposeOffering } from '../config/modelRegistry.js';
import { persistPlatformAgencyCore } from './kip/persistAgencyCore.js';
import { executeRegisteredChat } from './executeRegisteredChat.js';

export type CastOfferResult = {
  slug: string;
  offer: string;
  offeringId: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number | null;
};

export function buildCastOfferSystemPrompt(label: string, core: AgencyCoreV1 | null): string {
  const responsibility = core
    ? `Who: ${core.who}. Purpose: ${core.purpose}. Responsibilities: ${core.responsibilities.join('; ')}.`
    : 'Responsibility is unset. If the objective is not clearly yours, stay silent.';
  return [
    `You are ${label}. ${responsibility}`,
    'One job: if the human objective belongs to that responsibility, reply with JSON only: {"offer":"<one sentence naming the real next step in that responsibility>"}.',
    'If it does not, reply {"offer":""}.',
    'Do not perform the work. Do not recommend a Keeper object outside your responsibility. Silence is valid.',
  ].join(' ');
}

async function loadCastCore(slug: string): Promise<AgencyCoreV1 | null> {
  try {
    const row = await prisma.kip_agents.findUnique({
      where: { slug },
      select: { id: true, slug: true, config: true },
    });
    if (!row) return platformAgencyCore(slug);
    void persistPlatformAgencyCore(row);
    return resolveAgencyCore(row) ?? platformAgencyCore(slug);
  } catch {
    return platformAgencyCore(slug);
  }
}

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
  const core = await loadCastCore(params.slug);
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
        content: buildCastOfferSystemPrompt(params.label, core),
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
