/**
 * Director dialog continuity — resolve "try again" / refer-back into prior delegatable tasks.
 * Platform orchestration; not per-agent prompt teaching.
 */

export type DirectorContinuityMessage = {
  role: 'user' | 'agent';
  content: string;
};

const CONTINUITY_PHRASE_PATTERN =
  /^(?:try again|run (?:it|that) again|check again|check that again|same (?:thing|request|again)|do (?:it|that) again|one more time|run that|repeat (?:that|please)|again please|re-?run(?: that| it| please)?)[.!?]*$/i;

const REFER_BACK_PATTERN =
  /(?:previous|prior|last|earlier)\s+(?:prompt|message|request|question)|look at (?:the )?(?:previous|prior|last)/i;

const INSTRUMENT_ADDRESS_PATTERN = /^(cloud|rendr)\s*(?:[—\-:,]|,\s*)/i;

export function isDirectorContinuityPhrase(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (CONTINUITY_PHRASE_PATTERN.test(trimmed)) return true;
  if (REFER_BACK_PATTERN.test(trimmed)) return true;
  return false;
}

export function stripInstrumentAddressPrefix(message: string): string {
  return message.trim().replace(INSTRUMENT_ADDRESS_PATTERN, '').trim();
}

/** User message substantial enough to delegate to a board instrument. */
export function isDelegatableUserMessage(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed || trimmed === '[attachment]') return false;
  if (isDirectorContinuityPhrase(trimmed)) return false;
  if (REFER_BACK_PATTERN.test(trimmed)) return false;
  const withoutPrefix = stripInstrumentAddressPrefix(trimmed);
  if (!withoutPrefix || isDirectorContinuityPhrase(withoutPrefix)) return false;
  return withoutPrefix.length >= 8;
}

export function findLastDelegatableUserMessage(
  messages: readonly DirectorContinuityMessage[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== 'user') continue;
    const content = msg.content.trim();
    if (isDelegatableUserMessage(content)) return content;
  }
  return null;
}

export type ResolveDirectorDelegationMessageResult = {
  /** What the user typed this turn. */
  displayMessage: string;
  /** Task to send to the board instrument (may match a prior turn). */
  delegationMessage: string;
  resolvedFromPrior: boolean;
};

export function resolveDirectorDelegationMessage(params: {
  userMessage: string;
  priorMessages: readonly DirectorContinuityMessage[];
}): ResolveDirectorDelegationMessageResult {
  const displayMessage = params.userMessage.trim();
  if (!isDirectorContinuityPhrase(displayMessage)) {
    return {
      displayMessage,
      delegationMessage: displayMessage,
      resolvedFromPrior: false,
    };
  }

  const prior = findLastDelegatableUserMessage(
    params.priorMessages.filter((m) => m.content.trim() !== displayMessage),
  );

  if (!prior) {
    return {
      displayMessage,
      delegationMessage: displayMessage,
      resolvedFromPrior: false,
    };
  }

  return {
    displayMessage,
    delegationMessage: prior,
    resolvedFromPrior: true,
  };
}

/** Kip Echo / platform-collaboration composed prompts — not the human's words. */
export function isSupportEchoPrompt(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.startsWith('[Agent Echo —')
    || trimmed.startsWith('[Platform collaboration —')
  );
}

const SHORT_THREAD_REPLY_PATTERN =
  /^(?:yes|yeah|yep|yup|sure|ok|okay|please|do it|go(?: ahead)?|proceed|continue|propose|that|this|right|correct|exactly|do that|make it so)[.!?]*$/i;

/** Short follow-up that continues the last Lead turn ("Yes", "propose", "do it"). */
export function isLeadThreadReply(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (isDirectorContinuityPhrase(trimmed)) return true;
  if (SHORT_THREAD_REPLY_PATTERN.test(trimmed)) return true;
  if (trimmed.length <= 24 && !/[?]/.test(trimmed) && !isDelegatableUserMessage(trimmed)) {
    return true;
  }
  return false;
}

export function findLastAgentMessage(
  messages: readonly DirectorContinuityMessage[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== 'agent') continue;
    const content = msg.content.trim();
    if (!content) continue;
    if (isSupportEchoPrompt(content)) continue;
    return content;
  }
  return null;
}

export type ResolveLeadThreadReplyResult = {
  displayMessage: string;
  priorAgentMessage: string | null;
  resolvedFromPrior: boolean;
};

export function resolveLeadThreadReply(params: {
  userMessage: string;
  priorMessages: readonly DirectorContinuityMessage[];
}): ResolveLeadThreadReplyResult {
  const displayMessage = params.userMessage.trim();
  if (!isLeadThreadReply(displayMessage)) {
    return { displayMessage, priorAgentMessage: null, resolvedFromPrior: false };
  }
  const priorAgentMessage = findLastAgentMessage(params.priorMessages);
  if (!priorAgentMessage) {
    return { displayMessage, priorAgentMessage: null, resolvedFromPrior: false };
  }
  return { displayMessage, priorAgentMessage, resolvedFromPrior: true };
}

export function buildLeadContinuitySystemPrompt(priorAgentMessage: string): string {
  const prior = priorAgentMessage.trim().slice(0, 1200);
  return [
    'CONTINUITY — this user message is a short reply to your previous turn in this Dialog.',
    'Your previous turn:',
    `"${prior}"`,
    'Treat the current user message as answering or continuing that turn.',
    'Do not claim you are coming in fresh, mid-thread, or without prior context.',
    'If they said yes / proceed / propose, do the work they already asked for in that previous turn — emit the actions now.',
  ].join('\n');
}
