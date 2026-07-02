import type { DomainAudienceRole } from './resolveDomainAudience.js';

export type RealmVisibility = 'public' | 'friends' | 'owner';

export function getRealmVisibility(presenceSchema: unknown): RealmVisibility | null {
  if (!presenceSchema || typeof presenceSchema !== 'object') return null;
  const value = (presenceSchema as Record<string, unknown>).realmVisibility;
  if (value === 'public' || value === 'friends' || value === 'owner') return value;
  return null;
}

export function isContentVisibleToAudience(
  presenceSchema: unknown,
  audience: DomainAudienceRole,
): boolean {
  const visibility = getRealmVisibility(presenceSchema);
  if (!visibility) return true;
  if (visibility === 'public') return true;
  if (visibility === 'friends') return audience !== 'guest';
  if (visibility === 'owner') return audience === 'keeper' || audience === 'admin';
  return true;
}

export function filterContentByAudience<T extends { presenceSchema?: unknown }>(
  items: T[],
  audience: DomainAudienceRole,
): T[] {
  return items.filter((item) => isContentVisibleToAudience(item.presenceSchema, audience));
}
