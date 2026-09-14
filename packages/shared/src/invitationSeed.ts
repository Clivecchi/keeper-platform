export const INVITATION_SEED_LIMITS = {
  givenName: 80,
  relation: 240,
  about: 800,
} as const;

/**
 * Optional notes on a Domain invitation so agents can know the person
 * before (and after) they arrive. Not a role. Not email body.
 */
export interface InvitationSeed {
  givenName?: string;
  relation?: string;
  about?: string;
}

export interface DomainPersonNote {
  email: string;
  role: string;
  status: 'pending' | 'member';
  seed: InvitationSeed;
}

function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function invitationSeedHasContent(seed: InvitationSeed | null | undefined): seed is InvitationSeed {
  if (!seed) return false;
  return Boolean(seed.givenName || seed.relation || seed.about);
}

export function normalizeInvitationSeed(input: unknown): InvitationSeed | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const seed: InvitationSeed = {};
  const givenName = clip(raw.givenName, INVITATION_SEED_LIMITS.givenName);
  const relation = clip(raw.relation, INVITATION_SEED_LIMITS.relation);
  const about = clip(raw.about, INVITATION_SEED_LIMITS.about);
  if (givenName) seed.givenName = givenName;
  if (relation) seed.relation = relation;
  if (about) seed.about = about;
  return invitationSeedHasContent(seed) ? seed : null;
}

export function formatInvitationSeedLines(seed: InvitationSeed | null | undefined): string[] {
  const normalized = normalizeInvitationSeed(seed);
  if (!normalized) return [];
  const lines: string[] = [];
  if (normalized.givenName) lines.push(`Called ${normalized.givenName}`);
  if (normalized.relation) lines.push(normalized.relation);
  if (normalized.about) lines.push(normalized.about);
  return lines;
}

export function formatInvitationSeedForAgent(note: DomainPersonNote): string {
  const seed = note.seed;
  const name = seed.givenName || note.email;
  const status = note.status === 'pending' ? 'invited, not yet arrived' : 'member';
  const parts = [`${name} (${status}, ${note.role})`];
  if (seed.relation) parts.push(seed.relation);
  if (seed.about) parts.push(seed.about);
  if (seed.givenName && note.email) parts.push(note.email);
  return parts.join(' — ');
}
