import { DOMAIN_FRAME_FALLBACK } from './domainFrameFallback.js';

export interface BuildInitialDomainFrameInput {
  name: string;
  slug: string;
  description?: string | null;
  leadAgentSlug: string;
}

/** Personal domain frame_json — domain wordmark, not platform KE3P defaults. */
export function buildInitialDomainFrameJson(input: BuildInitialDomainFrameInput): Record<string, unknown> {
  const tagline = input.description?.trim() || '';
  const greeting = tagline
    ? `Welcome to ${input.name.trim()}. ${tagline}`
    : `Welcome to ${input.name.trim()}. What would you like to keep here?`;

  const base = DOMAIN_FRAME_FALLBACK as Record<string, unknown>;
  const baseTheme = (base.theme ?? {}) as Record<string, unknown>;
  const baseKip = (base.kip ?? {}) as Record<string, unknown>;
  const baseCover = (base.cover ?? {}) as Record<string, unknown>;
  const baseCard = ((baseCover.card ?? {}) as Record<string, unknown>);

  return {
    ...base,
    domain: input.slug,
    keeper_type: 'domain',
    theme: {
      ...baseTheme,
      wordmark: input.name.trim(),
      tagline,
    },
    kip: {
      ...baseKip,
      agent_id: input.leadAgentSlug,
      greeting,
    },
    cover: {
      ...baseCover,
      card: {
        ...baseCard,
        tagLine: tagline || undefined,
      },
    },
    kip_context: {
      guest: `A guest visiting ${input.name.trim()}. Warm welcome. Orient to what this domain keeps.`,
      keeper: `An authenticated keeper in ${input.name.trim()}. Orient to journeys, moments, and domain purpose.`,
      admin: `Domain admin for ${input.name.trim()}. Full configuration and governance context available.`,
    },
  };
}
