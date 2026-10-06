/**
 * Conversation Profile standing instruction.
 * Conversation and Cast use the short stack. Agency keeps the long action stack.
 * Hearing and action authority are decided elsewhere; these lines only set posture.
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

/** Conversation and Cast do not receive the long action sermons. Agency does. */
export function profileUsesThinInstruction(profile: ConversationProfile): boolean {
  return profile === 'conversation' || profile === 'cast';
}

export function buildConversationProfileLeadPrompt(profile: ConversationProfile): string {
  if (profile === 'cast') {
    return [
      'LEAD — you direct this Dialog. The Cast is in the room.',
      'You may see their offers. Direct one voice only when a contribution would change the reply. Silence is valid.',
      'Being in the room is not a reason to change Keeper. Emit an action only when the human explicitly asked for that action.',
      'Do not claim work that is not listed in the SESSION ACTION LOG.',
    ].join(' ');
  }
  return [
    'LEAD — you are in dialogue with the human.',
    'The Cast does not hear this turn unless the human explicitly cued someone.',
    'Talk. Emit a permitted action only when the human explicitly asked for that action.',
    'Do not claim work that is not listed in the SESSION ACTION LOG.',
  ].join(' ');
}

/** Thin machine contract: envelope + allowlist names + one receipt rule. */
export function buildConversationProfileProtocolPrompt(
  allowList: string[],
  profile: ConversationProfile = 'conversation',
): string {
  const actions = allowList.length ? allowList.join(', ') : '(none)';
  return [
    'Reply as a single JSON object with "type": "agent_output", "response" (string), optional "card", optional "keepingChoices", and optional "actions".',
    'Example: {"type":"agent_output","response":"Your message here.","actions":[]}',
    `Allowed actions: ${actions}.`,
    'Each action is { "type", "payload"? }. Never invent action types.',
    profile === 'cast'
      ? 'When the room asks you to direct, you may include "engage": { "slug", "aim" } on that same object. Omit engage to present with no contribution.'
      : null,
    allowList.includes('image.generate')
      ? 'When the human asks for an image, emit image.generate with payload.subject set to the picture. A card is not the image.'
      : null,
    'Do not claim an action ran unless it is listed in the SESSION ACTION LOG.',
  ].filter((line): line is string => Boolean(line)).join('\n');
}

/** Last instruction for Conversation and Cast. Agency keeps the performance posture. */
export function buildDialoguePosturePrompt(profile: 'conversation' | 'cast'): string {
  if (profile === 'cast') {
    return [
      'CAST PROFILE — last instruction.',
      'The room may offer and you may direct one contribution.',
      'Do not mutate Keeper unless the human explicitly requested that action.',
      'Speak the reply. Do not invent receipts.',
    ].join('\n');
  }
  return [
    'CONVERSATION PROFILE — last instruction.',
    'This is a dialogue with the human. The Cast is not routinely in the turn.',
    'Do not mutate Keeper unless they explicitly requested a permitted action. If they did, emit that action.',
    'Do not invent receipts.',
  ].join('\n');
}
