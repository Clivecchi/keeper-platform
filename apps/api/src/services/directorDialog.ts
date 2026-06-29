/**
 * Director dialog — server-side orchestration for IDE board Lead + instrument turns.
 */

import { prisma } from '@keeper/database';

/** Agent slug delegated by Lead on director-mode boards (IDE tools or domain lead agents). */
export type BoardInstrumentSlug = string;

export type DirectorDelegationRequest = {
  instrumentSlug: BoardInstrumentSlug;
  /** What the user typed this turn (display + session). */
  userMessage: string;
  /** When set, the task the instrument runs (continuity / try-again resolution). */
  taskMessage?: string;
  directorDisplayName: string;
};

export type DirectorDelegationResult = {
  attributedTo: string;
  content: string;
  status: 'ok' | 'empty' | 'error';
  error?: string;
};

const PLATFORM_INSTRUMENT_LABELS: Record<string, string> = {
  cloud: 'Cloud',
  rendr: 'Rendr',
};

export function instrumentLabelSync(slug: BoardInstrumentSlug): string {
  return PLATFORM_INSTRUMENT_LABELS[slug] ?? slug;
}

export async function resolveInstrumentLabel(slug: BoardInstrumentSlug): Promise<string> {
  const platform = PLATFORM_INSTRUMENT_LABELS[slug];
  if (platform) return platform;
  try {
    const agent = await prisma.kip_agents.findUnique({
      where: { slug },
      select: { name: true },
    });
    if (agent?.name?.trim()) return agent.name.trim();
  } catch {
    /* fall through */
  }
  return slug;
}

export function buildInstrumentDelegationPrompt(params: {
  userMessage: string;
  instrumentLabel: string;
  directorName: string;
  continuityCue?: string | null;
}): string {
  const task = params.userMessage.trim();
  const lines = [`[Director delegation — ${params.instrumentLabel} on the IDE board]`];

  if (params.continuityCue?.trim()) {
    lines.push(
      `The user asked to repeat or continue: "${params.continuityCue.trim()}"`,
      `Re-run the same task with fresh live reads (prior answers may be stale):`,
      `"${task}"`,
    );
  } else {
    lines.push(
      `The user addressed ${params.instrumentLabel} (instrument pinned on the IDE board).`,
      `${params.directorName} (Lead) relayed:`,
      `"${task}"`,
    );
  }

  lines.push(
    '',
    `Answer in first person as ${params.instrumentLabel}. One focused paragraph unless they asked for a list.`,
    `Be specific to your role. ${params.directorName} will synthesize for the user — do not speak as ${params.directorName}.`,
  );

  return lines.join('\n');
}

export function buildDirectorSynthesisPrompt(params: {
  userMessage: string;
  taskMessage?: string;
  instrumentLabel: string;
  instrumentReply: string;
  directorName: string;
}): string {
  const display = params.userMessage.trim();
  const task = params.taskMessage?.trim() || display;
  const isContinuation = task !== display;

  return [
    `[Director synthesis — ${params.directorName}]`,
    isContinuation
      ? `The user said "${display}" — continuing their prior request to ${params.instrumentLabel}:`
      : `The user asked (they may have addressed ${params.instrumentLabel} directly — that is expected when pinned):`,
    `"${task}"`,
    '',
    `${params.instrumentLabel} (board instrument) responded:`,
    `"${params.instrumentReply}"`,
    '',
    `Reply to the user as Lead (${params.directorName}).`,
    `- Integrate ${params.instrumentLabel}'s input; do not repeat it verbatim.`,
    `- Do NOT correct the user about who they addressed.`,
    `- Do NOT tell the user to "try ${params.instrumentLabel} again" or to flag routing issues.`,
    `- Do NOT claim this session starts cold or that earlier thread turns are unavailable — they are in context.`,
    `- Stay brief when ${params.instrumentLabel} already answered.`,
  ].join('\n');
}

export function buildDirectorFallbackSynthesisPrompt(params: {
  userMessage: string;
  taskMessage?: string;
  instrumentLabel: string;
  directorName: string;
}): string {
  const display = params.userMessage.trim();
  const task = params.taskMessage?.trim() || display;
  const isContinuation = task !== display;

  return [
    `[Director synthesis — ${params.directorName}]`,
    isContinuation
      ? `The user said "${display}" — continuing their prior request to ${params.instrumentLabel}:`
      : `The user addressed ${params.instrumentLabel} on the IDE board.`,
    `"${task}"`,
    '',
    `${params.instrumentLabel} did not return a reply this turn.`,
    '',
    `Reply as Lead (${params.directorName}). Answer the user's question directly and practically.`,
    `- Draw on what ${params.instrumentLabel} would typically know or do for this kind of request.`,
    `- Do NOT say the user is "talking to ${params.directorName}, not ${params.instrumentLabel}".`,
    `- Do NOT offer to hand off, retry, or coordinate with ${params.instrumentLabel}.`,
    `- Do NOT mention delegation, routing, or that ${params.instrumentLabel} failed to respond.`,
    `- Do NOT claim this session starts cold or that earlier thread turns are unavailable.`,
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
