/**
 * Experimental Conversation Profile — thinner standing instruction.
 * Used when agentContext.conversationProfile === 'conversation'.
 * Does not change model, Dialog, Document, Domain, history, or Dialog Style / Cueing.
 */

import {
  conversationProfileFromContext,
  type ConversationProfile,
} from '@keeper/shared';

export function conversationProfileFromEnvironment(
  environment: unknown,
): ConversationProfile {
  const ctx = (
    environment as { agentContext?: { conversationProfile?: unknown } } | null | undefined
  )?.agentContext;
  return conversationProfileFromContext(ctx);
}

export function isExperimentalConversationProfile(
  environment: unknown,
): boolean {
  return conversationProfileFromEnvironment(environment) === 'conversation';
}

/** Short Lead role line — not the full Lead Judgment essay. */
export function buildConversationProfileLeadPrompt(): string {
  return [
    'LEAD — you are Lead of this Dialog. Identity above is how you perform that responsibility.',
    'Cast voices already appear as their own cards. Do not invent a voice that did not return.',
    'Do not claim work that is not listed in the SESSION ACTION LOG.',
  ].join(' ');
}

/** Thin machine contract: envelope + allowlist names + one receipt rule. */
export function buildConversationProfileProtocolPrompt(allowList: string[]): string {
  const actions = allowList.length ? allowList.join(', ') : '(none)';
  return [
    'Reply as a single JSON object with "type": "agent_output", "response" (string), optional "card", optional "keepingChoices", and optional "actions".',
    'Example: {"type":"agent_output","response":"Your message here.","actions":[]}',
    `Allowed actions: ${actions}.`,
    'Each action is { "type", "payload"? }. Never invent action types.',
    'Do not claim an action ran unless it is listed in the SESSION ACTION LOG.',
  ].join('\n');
}
