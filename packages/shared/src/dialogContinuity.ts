/**
 * Recent Dialog turns handed to Cast.
 * Read-only conversational context for that request.
 * Not Cast's persisted chat, and not a behavioral instruction.
 */

export const DIALOG_CONTINUITY_TURN_LIMIT = 40;

export type DialogContinuityTurn = {
  role: 'user' | 'assistant';
  content: string;
};

function asContinuityRole(role: string): DialogContinuityTurn['role'] | null {
  if (role === 'user') return 'user';
  if (role === 'assistant' || role === 'agent') return 'assistant';
  return null;
}

/**
 * Turns the Lead already has, plus this human utterance when it is not already last.
 * No instruction text is added.
 */
export function recentDialogForCast(params: {
  loadedTurns: readonly { role: string; content: string }[];
  currentHumanMessage?: string | null;
}): DialogContinuityTurn[] {
  const turns: DialogContinuityTurn[] = [];
  for (const message of params.loadedTurns) {
    const content = typeof message.content === 'string' ? message.content.trim() : '';
    if (!content) continue;
    const role = asContinuityRole(message.role);
    if (!role) continue;
    turns.push({ role, content });
  }

  const current = params.currentHumanMessage?.trim() ?? '';
  if (current) {
    const last = turns[turns.length - 1];
    if (!(last?.role === 'user' && last.content === current)) {
      turns.push({ role: 'user', content: current });
    }
  }

  return turns.slice(-DIALOG_CONTINUITY_TURN_LIMIT);
}

/** Ephemeral Cast chat history is only what the handoff supplied. */
export function historyForEphemeralCast(
  supplied: readonly DialogContinuityTurn[] | null | undefined,
): DialogContinuityTurn[] {
  if (!supplied?.length) return [];
  const turns: DialogContinuityTurn[] = [];
  for (const turn of supplied) {
    if (!turn || (turn.role !== 'user' && turn.role !== 'assistant')) continue;
    const content = typeof turn.content === 'string' ? turn.content.trim() : '';
    if (!content) continue;
    turns.push({ role: turn.role, content });
  }
  return turns.slice(-DIALOG_CONTINUITY_TURN_LIMIT);
}
