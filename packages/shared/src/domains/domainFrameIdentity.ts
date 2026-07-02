/**
 * Detect platform-default frame_json on personal domains.
 * Values must stay aligned with API `DOMAIN_FRAME_FALLBACK` / GET `/:slug/frame` fallback.
 */

export const PLATFORM_FRAME_WORDMARKS = new Set(['ke3p', 'keeper']);

export const PLATFORM_FRAME_TAGLINE = 'cryptically designed, wonderfully underfolded';

export const PLATFORM_FRAME_GREETING = 'Hello. What would you like to keep today?';

export const PLATFORM_FRAME_ADMIN_CONTEXT = 'Platform admin. Full context available.';

export const PLATFORM_FRAME_KIP_AGENT_ID = 'kip-default';

export interface DomainFrameSeedCheck {
  domain?: string;
  keeper_type?: string;
  theme?: { wordmark?: string; tagline?: string };
  kip?: { agent_id?: string; greeting?: string };
  kip_context?: { guest?: string; admin?: string };
}

export function isPlatformFrameWordmark(wordmark: string | undefined | null): boolean {
  if (!wordmark?.trim()) return true;
  return PLATFORM_FRAME_WORDMARKS.has(wordmark.trim().toLowerCase());
}

export function isPlatformFrameTagline(tagline: string | undefined | null): boolean {
  if (!tagline?.trim()) return false;
  return tagline.trim().toLowerCase() === PLATFORM_FRAME_TAGLINE.toLowerCase();
}

/**
 * True when frame JSON still reflects platform defaults — empty DB row, API fallback,
 * or a persisted copy of the platform seed on a personal domain.
 */
export function domainFrameLooksUnseeded(
  frame: DomainFrameSeedCheck,
  domainSlug: string,
  domainName?: string | null,
): boolean {
  if (domainSlug === 'default') return false;

  if (frame.keeper_type === 'platform') return true;
  if (frame.domain === 'default') return true;

  const wordmark = frame.theme?.wordmark?.trim();
  if (!wordmark || isPlatformFrameWordmark(wordmark)) return true;

  const tagline = frame.theme?.tagline?.trim() ?? '';
  if (isPlatformFrameTagline(tagline)) return true;

  const kipAgentId = frame.kip?.agent_id?.trim();
  if (kipAgentId === PLATFORM_FRAME_KIP_AGENT_ID) return true;

  const kipGreeting = frame.kip?.greeting?.trim() ?? '';
  if (kipGreeting === PLATFORM_FRAME_GREETING) return true;

  const adminContext = frame.kip_context?.admin?.trim() ?? '';
  if (adminContext === PLATFORM_FRAME_ADMIN_CONTEXT) return true;

  const name = domainName?.trim();
  if (name && wordmark === name) return false;

  return false;
}
