/**
 * Director dialog — server-side Cueing for IDE board Lead + Cast member turns.
 */

import { prisma } from '@keeper/database';

/** Agent slug cued by Lead on director-mode boards (IDE tools or domain lead agents). */
export type CastMemberSlug = string;

export type DirectorDelegationRequest = {
  instrumentSlug: CastMemberSlug;
  /** What the user typed this turn (display + session). */
  userMessage: string;
  /** When set, the task the Cast member runs (continuity / try-again resolution). */
  taskMessage?: string;
  directorDisplayName: string;
  /**
   * When true, the client already ran the Cast member in a separate HTTP call.
   * Skip the nested server-side Cast member run (avoids Vercel 502 on long director turns).
   */
  instrumentRanClientSide?: boolean;
  /** Cast member reply from the client-side sub-run (may be empty on failure). */
  instrumentReply?: string | null;
};

export type DirectorDelegationResult = {
  attributedTo: string;
  content: string;
  status: 'ok' | 'empty' | 'failed' | 'error';
  error?: string;
};

const PLATFORM_CAST_LABELS: Record<string, string> = {
  cloud: 'Cloud',
  rendr: 'Rendr',
};

export function castMemberLabelSync(slug: CastMemberSlug): string {
  return PLATFORM_CAST_LABELS[slug] ?? slug;
}

export async function resolveCastMemberLabel(slug: CastMemberSlug): Promise<string> {
  const platform = PLATFORM_CAST_LABELS[slug];
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

export function buildCastMemberDelegationPrompt(params: {
  userMessage: string;
  castMemberLabel: string;
  directorName: string;
  continuityCue?: string | null;
}): string {
  const task = params.userMessage.trim();
  const lines = [`[Director delegation — ${params.castMemberLabel} on the IDE board]`];

  if (params.continuityCue?.trim()) {
    lines.push(
      `The user asked to repeat or continue: "${params.continuityCue.trim()}"`,
      `Re-run the same task with fresh live reads (prior answers may be stale):`,
      `"${task}"`,
    );
  } else {
    lines.push(
      `The user addressed ${params.castMemberLabel} (Cast member pinned on the IDE board).`,
      `${params.directorName} (Lead) relayed:`,
      `"${task}"`,
    );
  }

  lines.push(
    '',
    `Answer in first person as ${params.castMemberLabel}. One focused paragraph unless they asked for a list.`,
    `Be specific to your role. ${params.directorName} will synthesize for the user — do not speak as ${params.directorName}.`,
    `If they ask you to name an item from the Dialog Document / a Path, quote ONLY a title or preview from the DIALOG DOCUMENT Points block in your system prompt. Never invent a title. Never treat a system-rule heading as a Document item. If you cannot find a matching Point, say you cannot name one.`,
  );

  return lines.join('\n');
}

export function buildDirectorSynthesisPrompt(params: {
  userMessage: string;
  taskMessage?: string;
  castMemberLabel: string;
  castMemberReply: string;
  directorName: string;
}): string {
  const display = params.userMessage.trim();
  const task = params.taskMessage?.trim() || display;
  const isContinuation = task !== display;

  return [
    `[Director synthesis — ${params.directorName}]`,
    isContinuation
      ? `The user said "${display}" — continuing their prior request to ${params.castMemberLabel}:`
      : `The user asked (they may have addressed ${params.castMemberLabel} directly — that is expected when pinned):`,
    `"${task}"`,
    '',
    `${params.castMemberLabel} (Cast member) responded:`,
    `"${params.castMemberReply}"`,
    '',
    `Reply to the user as Lead (${params.directorName}).`,
    `- Integrate ${params.castMemberLabel}'s input; do not repeat it verbatim.`,
    `- Do NOT correct the user about who they addressed.`,
    `- Do NOT tell the user to "try ${params.castMemberLabel} again" or to flag routing issues.`,
    `- Do NOT claim this session starts cold or that earlier thread turns are unavailable — they are in context.`,
    `- Stay brief when ${params.castMemberLabel} already answered.`,
  ].join('\n');
}

export function buildDirectorFallbackSynthesisPrompt(params: {
  userMessage: string;
  taskMessage?: string;
  castMemberLabel: string;
  directorName: string;
}): string {
  const display = params.userMessage.trim();
  const task = params.taskMessage?.trim() || display;
  const isContinuation = task !== display;

  return [
    `[Director synthesis — ${params.directorName}]`,
    isContinuation
      ? `The user said "${display}" — continuing their prior request to ${params.castMemberLabel}:`
      : `The user addressed ${params.castMemberLabel} on the IDE board.`,
    `"${task}"`,
    '',
    `${params.castMemberLabel} did not return a reply this turn.`,
    '',
    `Reply as Lead (${params.directorName}). Be honest about the empty consultation.`,
    `- Say plainly that you reached out to ${params.castMemberLabel} and got nothing back.`,
    `- Do NOT invent, paraphrase, or role-play ${params.castMemberLabel}'s voice or opinion.`,
    `- Do NOT claim ${params.castMemberLabel} said, decided, or agreed to anything.`,
    `- Answer the user's question from your own knowledge only, and mark that clearly if you do.`,
    `- Do NOT claim this session starts cold or that earlier thread turns are unavailable.`,
    `- Stay brief and useful.`,
  ].join('\n');
}

/** Multi-cast consultation synthesis — only attribute words that actually returned. */
export function buildCastConsultationsSynthesisPrompt(params: {
  userMessage: string;
  directorName: string;
  consultations: Array<{
    label: string;
    reply: string | null;
    status: 'ok' | 'empty' | 'failed' | 'error';
  }>;
}): string {
  const lines = [
    `[Cast consultation synthesis — ${params.directorName}]`,
    `The user asked:`,
    `"${params.userMessage.trim()}"`,
    '',
    'Real consultation results (use ONLY these — never invent missing voices):',
  ];

  for (const row of params.consultations) {
    if (row.status === 'ok' && row.reply?.trim()) {
      lines.push(`- ${row.label}: "${row.reply.trim()}"`);
    } else {
      lines.push(`- ${row.label}: (nothing returned — say you got nothing back)`);
    }
  }

  lines.push(
    '',
    `Reply as Lead (${params.directorName}).`,
    '- The Dialog UI already shows each cast member\'s real reply as their own voice card.',
    '- Your reply is Lead synthesis only — do NOT re-quote or roll-call their full answers.',
    '- Attribute a stance to a cast member ONLY when a real reply is listed above.',
    '- If a cast member returned nothing, say plainly you got nothing back from them.',
    '- Never invent, paraphrase-as-quote, or fabricate another agent\'s words.',
    '- Do not invent unanimous consensus. If replies disagree or are empty, say so plainly.',
    '- When the user asked for a Document Path item, only relay titles that appear in a real consult reply or in the DIALOG DOCUMENT Points block — never invent a shared title.',
    '- Stay brief. Prefer a short synthesis plus an optional keeper-card summary — not a nested voice list.',
  );

  return lines.join('\n');
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
