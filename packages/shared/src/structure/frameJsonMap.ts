/**
 * Maps V0 frame route keys to DomainFrameJson property paths.
 * Canonical source for web, API (kip-designer), and structure contracts.
 */

export const FRAME_TO_JSON_KEY = {
  cover: 'cover',
  commons: 'commons',
  index: null,
  moment: 'moment',
  moments: 'kept_moments',
  present: null,
  diagnostics: 'diagnostics',
  feed: 'feed',
  keepers: 'keepers',
  journeys: 'journeys',
  profile: 'profile',
  agent: 'agent_board',
  kip: 'kip',
  admin: 'domain_admin',
  theme: 'theme',
  hub: null,
} as const satisfies Record<string, string | null>;

export type FrameRouteKey = keyof typeof FRAME_TO_JSON_KEY;

export type DomainFrameSliceKey = NonNullable<(typeof FRAME_TO_JSON_KEY)[FrameRouteKey]>;

export function normalizeFrameRouteKey(frameKey: string): string {
  return frameKey.trim().toLowerCase();
}

export function isKnownFrameRouteKey(frameKey: string): frameKey is FrameRouteKey {
  return normalizeFrameRouteKey(frameKey) in FRAME_TO_JSON_KEY;
}

/**
 * Resolve the DomainFrameJson property for a frame route key.
 * Returns null when the frame has no governed JSON slice (index, present, hub).
 */
export function getJsonSlicePath(frameKey: string): DomainFrameSliceKey | null {
  const normalized = normalizeFrameRouteKey(frameKey);
  if (!isKnownFrameRouteKey(normalized)) {
    return null;
  }
  return FRAME_TO_JSON_KEY[normalized];
}

export function isGovernedFrameKey(frameKey: string): boolean {
  return getJsonSlicePath(frameKey) !== null;
}

export function getFrameSliceFromDomainFrame(
  frameJson: Record<string, unknown> | null | undefined,
  frameKey: string,
): unknown | null {
  const jsonKey = getJsonSlicePath(frameKey);
  if (!jsonKey || !frameJson) {
    return null;
  }
  return frameJson[jsonKey] ?? null;
}

export function toDomainFrameStructureContractId(
  frameKey: string,
): `domain.frame.${string}` | null {
  if (!isGovernedFrameKey(frameKey)) {
    return null;
  }
  return `domain.frame.${normalizeFrameRouteKey(frameKey)}`;
}
