/**
 * Conversation Profile — which standing-instruction environment the agent
 * enters before the human's message.
 *
 * Distinct from Dialog Style (room rhythm) and Dialog Cueing (who is on stage).
 * First experimental values only. More profiles may join this family later.
 */

export const CONVERSATION_PROFILES = ['current', 'conversation'] as const;

export type ConversationProfile = (typeof CONVERSATION_PROFILES)[number];

export const DEFAULT_CONVERSATION_PROFILE: ConversationProfile = 'current';

export const CONVERSATION_PROFILE_LABELS: Record<ConversationProfile, string> = {
  current: 'Current',
  conversation: 'Conversation',
};

export function isConversationProfile(value: unknown): value is ConversationProfile {
  return value === 'current' || value === 'conversation';
}

export function parseConversationProfile(value: unknown): ConversationProfile {
  return isConversationProfile(value) ? value : DEFAULT_CONVERSATION_PROFILE;
}

/** Compact environment / agentContext may nest the profile. */
export function conversationProfileFromContext(
  context: { conversationProfile?: unknown } | null | undefined,
): ConversationProfile {
  return parseConversationProfile(context?.conversationProfile);
}
