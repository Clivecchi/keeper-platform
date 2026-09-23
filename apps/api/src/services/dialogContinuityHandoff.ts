/**
 * Lead → Cast conversational handoff.
 * Supplied turns are read-only context on an ephemeral Cast run.
 * They are not written as that Cast member's chat history.
 */

import {
  historyForEphemeralCast,
  recentDialogForCast,
  type DialogContinuityTurn,
} from '@keeper/shared';
import { visibleAgentMessageText } from './structure/parseKipAgentOutput.js';

type LoadedDialogMessage = {
  sender?: string | null;
  role?: string | null;
  content?: unknown;
};

export function leadDialogContinuity(params: {
  loadedMessages: readonly LoadedDialogMessage[];
  currentHumanMessage?: string | null;
}): DialogContinuityTurn[] {
  return recentDialogForCast({
    loadedTurns: params.loadedMessages.map((message) => {
      const raw = typeof message.content === 'string' ? message.content : '';
      const isUser = message.sender === 'user' || message.role === 'user';
      return {
        role: isUser ? 'user' : 'agent',
        content: isUser ? raw : visibleAgentMessageText(raw),
      };
    }),
    currentHumanMessage: params.currentHumanMessage,
  });
}

/** Chat turns for an ephemeral Cast model call. Empty when the handoff supplied none. */
export function ephemeralCastHistory(
  supplied: readonly DialogContinuityTurn[] | null | undefined,
): DialogContinuityTurn[] {
  return historyForEphemeralCast(supplied);
}
