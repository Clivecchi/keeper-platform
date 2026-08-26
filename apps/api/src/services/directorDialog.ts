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
  /** Client-run cast action receipts — merged into Lead actionResults for UI. */
  actionResults?: Array<Record<string, unknown>>;
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
  /** Dialog Style Vibe — short presence beats, not essays. */
  dialogStyle?: 'vibe' | string | null;
}): string {
  const task = params.userMessage.trim();
  const vibe = params.dialogStyle === 'vibe';
  const lines = [`[Director delegation — ${params.castMemberLabel} on the Build board]`];

  if (params.continuityCue?.trim()) {
    lines.push(
      `The user asked to repeat or continue: "${params.continuityCue.trim()}"`,
      `Re-run the same task with fresh live reads (prior answers may be stale):`,
      `"${task}"`,
    );
  } else {
    lines.push(
      `The user addressed ${params.castMemberLabel} (Cast member pinned on the Build board).`,
      `${params.directorName} (Lead) relayed:`,
      `"${task}"`,
    );
  }

  if (vibe) {
    lines.push(
      '',
      `DIALOG STYLE: Vibe — you are in the room for rhythm and presence, not a report.`,
      `Answer in first person as ${params.castMemberLabel}. Default: one short beat (a few words up to two sentences) — "Cool.", "Heard.", "Makes sense — …".`,
      `Only go longer when you have a Document-worthy Point to surface; then keep it to one tight sentence plus the Point title.`,
      `${params.directorName} (Lead) carries the song — do not speak as ${params.directorName}.`,
    );
  } else {
    lines.push(
      '',
      `Answer in first person as ${params.castMemberLabel}. Keep prose to one short paragraph (or a tight bullet list if they asked for one).`,
      `Be specific to your role. ${params.directorName} will synthesize for the user — do not speak as ${params.directorName}.`,
      `When your lane answer is operational (feasibility, stance, design constraint the user must act on), also emit envelope "card" type "summary" or "info" with title + body (optional items). Short prose + card — not a wall of text.`,
    );
  }

  lines.push(
    `You cannot write the Document. Do not say "I'll capture it now" or "I'll add a Point" as if the write already happened.`,
    `If a Point belongs on the Document, name the title, the Section (if you have one), and the body in one breath so ${params.directorName} can draft.update.propose.`,
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
    `Reply to the user as Lead (${params.directorName}). Talk like a person — 1–3 short sentences.`,
    `- Integrate ${params.castMemberLabel}'s input; do not repeat it verbatim.`,
    `- Do NOT paste ### ${params.castMemberLabel} headings — Dialog already shows their voice card.`,
    `- If ${params.castMemberLabel} said they would capture or add a Point, they cannot write the Document. You emit draft.update.propose this turn. Use payload.section when they named a Section.`,
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
      : `The user addressed ${params.castMemberLabel} on the Build board.`,
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
  castPromisedPointWrite?: boolean;
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
    `Reply as Lead (${params.directorName}). Talk like a person in the room.`,
    '- The Dialog UI already shows each cast member\'s real reply as their own voice card.',
    '- Your reply is 1–3 short sentences in your own voice. Not a committee report.',
    '- Do NOT use ### Cloud / ### Rendr headings. Do NOT write "Cloud and Rendr have identified…" or "both agree…".',
    '- Attribute a stance to a cast member ONLY when a real reply is listed above — and then in a clause, not a roll-call.',
    '- If a cast member returned nothing, say plainly you got nothing back from them.',
    '- Never invent, paraphrase-as-quote, or fabricate another agent\'s words.',
    '- Do not invent unanimous consensus. If replies disagree or are empty, say so plainly.',
    '- When the user asked for a Document Path item, only relay titles that appear in a real consult reply or in the DIALOG DOCUMENT Points block — never invent a shared title.',
    '- A named Section is draft.update.propose with payload.section. Never document.reorganize.propose to add a Section. Never draft.point.accept — Accept is a human Chronicle action.',
  );

  if (params.castPromisedPointWrite) {
    lines.push(
      '- A cast member said they would capture/add a Point. They cannot write the Document. You must emit draft.update.propose this turn.',
      '- Use payload.section when they named a Section (e.g. Keeper Stage). payload.prelude is the short title. payload.content is the Point body (Rendr\'s line, the design principle — whatever they offered).',
      '- Short prose + the action. Do not sit silent after they promised a write. If the write fails, say so.',
    );
  }

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

/** Nested cast/Lead run envelopes — same action list Lead returns as `data.actions`. */
export function extractActionResultsFromAgentRunResult(result: unknown): unknown[] {
  const visit = (node: unknown, depth = 0): unknown[] | null => {
    if (!node || typeof node !== 'object' || depth > 5) return null;
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj.actions)) return obj.actions;
    if (obj.data !== undefined) return visit(obj.data, depth + 1);
    return null;
  };
  return visit(result) ?? [];
}

export function annotateCastActionResults(
  actions: unknown[],
  attribution: { castSlug: string; attributedTo: string },
): Array<Record<string, unknown>> {
  return actions
    .filter((action): action is Record<string, unknown> =>
      Boolean(action) && typeof action === 'object' && !Array.isArray(action),
    )
    .map((row) => {
      const data =
        row.data && typeof row.data === 'object' && !Array.isArray(row.data)
          ? (row.data as Record<string, unknown>)
          : {};
      return {
        ...row,
        data: {
          ...data,
          castSlug: attribution.castSlug,
          attributedTo: attribution.attributedTo,
        },
      };
    });
}

/** Internal-only — never surface this copy in the Dialog UI. */
export function isDirectorDelegationFailureContent(content: string): boolean {
  return /did not respond this turn/i.test(content.trim());
}
