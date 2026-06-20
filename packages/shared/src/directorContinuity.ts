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
