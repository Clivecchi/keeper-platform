import type { DomainAudienceRole } from './resolveDomainAudience.js';

/** Minimum audience level required to see a frame element (hierarchical). */
export const AUDIENCE_LEVEL: Record<DomainAudienceRole, number> = {
  guest: 0,
  friend: 1,
  keeper: 2,
  admin: 3,
};

/**
 * True when `audience` meets or exceeds any role listed in `availableTo`.
 * Friend is an authenticated subset: sees guest + friend tiers, not keeper-only items.
 */
export function isVisibleToAudience(
  availableTo: readonly DomainAudienceRole[],
  audience: DomainAudienceRole,
): boolean {
  if (!availableTo.length) return true;
  const level = AUDIENCE_LEVEL[audience];
  return availableTo.some((role) => level >= AUDIENCE_LEVEL[role]);
}
