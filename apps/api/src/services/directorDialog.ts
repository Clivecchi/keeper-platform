/**
 * Director dialog — server-side orchestration for IDE board Lead + instrument turns.
 */

export type BoardInstrumentSlug = 'cloud' | 'rendr';

export type DirectorDelegationRequest = {
  instrumentSlug: BoardInstrumentSlug;
  userMessage: string;
  directorDisplayName: string;
};

export type DirectorDelegationResult = {
  attributedTo: string;
  content: string;
  status: 'ok' | 'empty' | 'error';
  error?: string;
};

const INSTRUMENT_LABELS: Record<BoardInstrumentSlug, string> = {
  cloud: 'Cloud',
  rendr: 'Rendr',
};

export function instrumentLabel(slug: BoardInstrumentSlug): string {
  return INSTRUMENT_LABELS[slug] ?? slug;
}

export function buildInstrumentDelegationPrompt(params: {
  userMessage: string;
  instrumentLabel: string;
  directorName: string;
}): string {
  return [
    `[Director delegation — ${params.instrumentLabel} on the IDE board]`,
    `The user addressed ${params.instrumentLabel} (instrument pinned on the IDE board).`,
    `${params.directorName} (Lead) relayed:`,
    `"${params.userMessage}"`,
    '',
    `Answer in first person as ${params.instrumentLabel}. One focused paragraph unless they asked for a list.`,
    `Be specific to your role. ${params.directorName} will synthesize for the user — do not speak as ${params.directorName}.`,
  ].join('\n');
}

export function buildDirectorSynthesisPrompt(params: {
  userMessage: string;
  instrumentLabel: string;
  instrumentReply: string;
  directorName: string;
}): string {
  return [
    `[Director synthesis — ${params.directorName}]`,
    `The user asked (they may have addressed ${params.instrumentLabel} directly — that is expected when pinned):`,
    `"${params.userMessage}"`,
    '',
    `${params.instrumentLabel} (board instrument) responded:`,
    `"${params.instrumentReply}"`,
    '',
    `Reply to the user as Lead (${params.directorName}).`,
    `- Integrate ${params.instrumentLabel}'s input; do not repeat it verbatim.`,
    `- Do NOT correct the user about who they addressed.`,
    `- Do NOT tell the user to "try ${params.instrumentLabel} again" or to flag routing issues.`,
    `- Stay brief when ${params.instrumentLabel} already answered.`,
  ].join('\n');
}

export function buildDirectorFallbackSynthesisPrompt(params: {
  userMessage: string;
  instrumentLabel: string;
  directorName: string;
}): string {
  return [
    `[Director synthesis — ${params.directorName}]`,
    `The user addressed ${params.instrumentLabel} on the IDE board.`,
    `"${params.userMessage}"`,
    '',
    `${params.instrumentLabel} did not return a reply this turn.`,
    '',
    `Reply as Lead (${params.directorName}). Answer the user's question directly and practically.`,
    `- Draw on what ${params.instrumentLabel} would typically know or do for this kind of request.`,
    `- Do NOT say the user is "talking to ${params.directorName}, not ${params.instrumentLabel}".`,
    `- Do NOT offer to hand off, retry, or coordinate with ${params.instrumentLabel}.`,
    `- Do NOT mention delegation, routing, or that ${params.instrumentLabel} failed to respond.`,
    `- Stay brief and useful.`,
  ].join('\n');
}

export function extractReplyFromAgentRunResult(result: unknown): string | null {
  const visit = (node: unknown, depth = 0): string | null => {
    if (!node || typeof node !== 'object' || depth > 5) return null;
    const obj = node as Record<string, unknown>;
    const response = obj.response;
    if (typeof response === 'string' && response.trim()) return response.trim();
    if (obj.data !== undefined) return visit(obj.data, depth + 1);
    return null;
  };
  return visit(result);
}

/** Internal-only — never surface this copy in the Dialog UI. */
export function isDirectorDelegationFailureContent(content: string): boolean {
  return /did not respond this turn/i.test(content.trim());
}
