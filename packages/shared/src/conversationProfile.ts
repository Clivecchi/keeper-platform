/**
 * Conversation Profile — the human-facing room contract for a turn.
 *
 * Conversation: talk with the Lead. The Cast does not routinely hear.
 * Cast: the room hears. Offers or silence, then the Lead may direct.
 * Agency: the same hearing, plus Keeper's existing actions and receipts.
 *
 * Dialog Cueing stays internal: the Lead directs the turn.
 * An explicit chip cue narrows who hears. It is not required before Cast or Agency can hear.
 * Legacy `current` migrates to Conversation so an old browser does not suddenly open the room.
 */

export const CONVERSATION_PROFILES = ['conversation', 'cast', 'agency'] as const;

export type ConversationProfile = (typeof CONVERSATION_PROFILES)[number];

export const DEFAULT_CONVERSATION_PROFILE: ConversationProfile = 'conversation';

export const CONVERSATION_PROFILE_LABELS: Record<ConversationProfile, string> = {
  conversation: 'Conversation',
  cast: 'Cast',
  agency: 'Agency',
};

export const CONVERSATION_PROFILE_SUMMARIES: Record<ConversationProfile, string> = {
  conversation: 'Talk with me.',
  cast: 'Be in the room with me.',
  agency: 'Work with me.',
};

export function isConversationProfile(value: unknown): value is ConversationProfile {
  return value === 'conversation' || value === 'cast' || value === 'agency';
}

/** Accepts the three profiles. Legacy `current` and anything else become Conversation. */
export function parseConversationProfile(value: unknown): ConversationProfile {
  if (value === 'current') return 'conversation';
  return isConversationProfile(value) ? value : DEFAULT_CONVERSATION_PROFILE;
}

export function conversationProfileFromContext(
  context: { conversationProfile?: unknown } | null | undefined,
): ConversationProfile {
  return parseConversationProfile(context?.conversationProfile);
}

/** Cast and Agency open the existing offer room. Conversation does not. */
export function profileHearsCast(profile: ConversationProfile): boolean {
  return profile === 'cast' || profile === 'agency';
}

/**
 * Who hears this turn.
 * A non-empty explicit cue is the hearing set (the human narrowed the room).
 * With no cue, Cast and Agency hear the eligible voices. Conversation hears no one.
 * A named address is handled by the existing single-member consultation, not here.
 */
export function resolveProfileHearingSlugs(params: {
  profile: ConversationProfile;
  explicitCues: readonly string[];
  eligibleVoiceSlugs: readonly string[];
}): string[] {
  const explicit = uniqueSlugs(params.explicitCues);
  if (explicit.length > 0) return explicit;
  if (!profileHearsCast(params.profile)) return [];
  return uniqueSlugs(params.eligibleVoiceSlugs);
}

function uniqueSlugs(slugs: readonly string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of slugs) {
    const slug = raw.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    next.push(slug);
  }
  return next;
}
