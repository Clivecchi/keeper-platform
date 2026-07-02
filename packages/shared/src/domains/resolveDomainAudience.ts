/**
 * Domain-scoped audience resolution (Phase 3.2).
 * Extends guest | keeper | admin with `friend` for connection-scoped members.
 */

export type DomainAudienceRole = 'guest' | 'friend' | 'keeper' | 'admin';

export interface ResolveDomainAudienceInput {
  isAuthenticated: boolean;
  /** Platform super-admin (not domain role). */
  isAdmin: boolean;
  isOwner: boolean;
  domainRole?: string | null;
}

const FRIEND_ROLES = new Set(['friend', 'connection']);

export function resolveDomainAudience(input: ResolveDomainAudienceInput): DomainAudienceRole {
  if (!input.isAuthenticated) return 'guest';
  if (input.isAdmin || input.isOwner || input.domainRole === 'admin') return 'admin';
  if (input.domainRole && FRIEND_ROLES.has(input.domainRole)) return 'friend';
  if (input.domainRole === 'user') return 'keeper';
  // Authenticated visitor without domain membership — legacy keeper audience
  return 'keeper';
}
