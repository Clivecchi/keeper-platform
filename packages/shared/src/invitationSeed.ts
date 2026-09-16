export const INVITATION_SEED_LIMITS = {
  givenName: 80,
  relation: 240,
  about: 800,
  briefingCount: 4,
  briefingTitle: 80,
  briefingBody: 2000,
} as const;

export type InvitationBriefingKind = 'note' | 'prompt' | 'document';

/**
 * Text the inviter attaches so the Domain lead can know the person.
 * Not email body. Co-ownership of these notes is later — they stay inviter-held.
 */
export interface InvitationBriefingNote {
  kind: InvitationBriefingKind;
  title?: string;
  body: string;
}

/**
 * Optional notes on a Domain invitation so agents can know the person
 * before (and after) they arrive. Not a role. Not email body.
 */
export interface InvitationSeed {
  givenName?: string;
  relation?: string;
  about?: string;
  briefing?: InvitationBriefingNote[];
  /** Stub: briefing stays with the inviting Domain until co-ownership exists. */
  coOwnership?: 'inviter-held';
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

function clipMultiline(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function normalizeBriefingKind(value: unknown): InvitationBriefingKind {
  if (value === 'prompt' || value === 'document') return value;
  return 'note';
}

function normalizeBriefing(input: unknown): InvitationBriefingNote[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const notes: InvitationBriefingNote[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const raw = entry as Record<string, unknown>;
    const body = clipMultiline(raw.body, INVITATION_SEED_LIMITS.briefingBody);
    if (!body) continue;
    const note: InvitationBriefingNote = {
      kind: normalizeBriefingKind(raw.kind),
      body,
    };
    const title = clip(raw.title, INVITATION_SEED_LIMITS.briefingTitle);
    if (title) note.title = title;
    notes.push(note);
    if (notes.length >= INVITATION_SEED_LIMITS.briefingCount) break;
  }
  return notes.length > 0 ? notes : undefined;
}

export function invitationSeedHasContent(seed: InvitationSeed | null | undefined): seed is InvitationSeed {
  if (!seed) return false;
  return Boolean(seed.givenName || seed.relation || seed.about || (seed.briefing && seed.briefing.length > 0));
}

export function normalizeInvitationSeed(input: unknown): InvitationSeed | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const seed: InvitationSeed = {};
  const givenName = clip(raw.givenName, INVITATION_SEED_LIMITS.givenName);
  const relation = clip(raw.relation, INVITATION_SEED_LIMITS.relation);
  const about = clip(raw.about, INVITATION_SEED_LIMITS.about);
  const briefing = normalizeBriefing(raw.briefing);
  if (givenName) seed.givenName = givenName;
  if (relation) seed.relation = relation;
  if (about) seed.about = about;
  if (briefing) {
    seed.briefing = briefing;
    seed.coOwnership = 'inviter-held';
  }
  return invitationSeedHasContent(seed) ? seed : null;
}

export function formatInvitationSeedLines(seed: InvitationSeed | null | undefined): string[] {
  const normalized = normalizeInvitationSeed(seed);
  if (!normalized) return [];
  const lines: string[] = [];
  if (normalized.givenName) lines.push(`Called ${normalized.givenName}`);
  if (normalized.relation) lines.push(normalized.relation);
  if (normalized.about) lines.push(normalized.about);
  for (const note of normalized.briefing ?? []) {
    const label = note.kind === 'prompt' ? 'Prompt' : note.kind === 'document' ? 'Document' : 'Note';
    lines.push(note.title ? `${label}: ${note.title}` : label);
  }
  return lines;
}

export function formatInvitationSeedForAgent(note: DomainPersonNote): string {
  const seed = note.seed;
  const name = seed.givenName || note.email;
  const status = note.status === 'pending' ? 'invited, not yet arrived' : 'member';
  const parts = [`${name} (${status}, ${note.role})`];
  if (seed.relation) parts.push(seed.relation);
  if (seed.about) parts.push(seed.about);
  for (const briefing of seed.briefing ?? []) {
    const label = briefing.kind === 'prompt' ? 'prompt' : briefing.kind === 'document' ? 'document' : 'note';
    const title = briefing.title ? `${label} “${briefing.title}”` : label;
    parts.push(`${title}: ${briefing.body}`);
  }
  if (seed.givenName && note.email) parts.push(note.email);
  return parts.join(' — ');
}
