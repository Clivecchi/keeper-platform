/**
 * Director dialog — server-side Cueing for IDE board Lead + Cast member turns.
 * After Cast, orchestration context informs the Lead. It does not impersonate the human.
 */

import { buildCastSpeechAndAgencyLines } from '@keeper/shared';
import { prisma } from '@keeper/database';

/** Agent slug cued by Lead on director-mode boards (IDE tools or domain lead agents). */
export type CastMemberSlug = string;

/** Stage / board coordinates Lead already has — copy onto Mechanism B Cast runs. */
export function stageContextForDelegatedCast(
  leadContext: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!leadContext || typeof leadContext !== 'object' || Array.isArray(leadContext)) {
    return undefined;
  }
  const next: Record<string, unknown> = {};
  if (leadContext.workspaceSurface === 'stage') {
    next.workspaceSurface = 'stage';
  }
  if (typeof leadContext.boardId === 'string' && leadContext.boardId.trim()) {
    next.boardId = leadContext.boardId.trim();
  }
  if (typeof leadContext.dialogCueing === 'string' && leadContext.dialogCueing.trim()) {
    next.dialogCueing = leadContext.dialogCueing.trim();
  }
  return Object.keys(next).length ? next : undefined;
}

export function attachStageContextToCastEnvironment<T>(
  env: T | null | undefined,
  leadContext: Record<string, unknown> | null | undefined,
): T | null | undefined {
  const stage = stageContextForDelegatedCast(leadContext);
  if (!env || !stage || typeof env !== 'object') return env;
  const current = env as T & { agentContext?: Record<string, unknown> };
  return {
    ...current,
    agentContext: {
      ...(current.agentContext ?? {}),
      ...stage,
    },
  };
}

export function delegateConsultSkipMessage(composerConsultedThisTurn: boolean): string {
  return composerConsultedThisTurn
    ? 'delegate.consult skipped — Composer Cast chips already consulted this turn'
    : 'delegate.consult blocked in nested cast run (loop prevention)';
}

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
  /** Existing keeper-card from the Cast run — advisory channel. */
  instrumentCard?: Record<string, unknown>;
};

export type DirectorDelegationResult = {
  attributedTo: string;
  content: string;
  status: 'ok' | 'empty' | 'failed' | 'error';
  error?: string;
  /** Existing keeper-card that crossed from the Cast run. */
  card?: {
    type: string;
    title: string;
    body?: string;
    meta?: string;
    items?: string[];
  };
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

  lines.push(
    '',
    ...buildCastSpeechAndAgencyLines({
      castMemberLabel: params.castMemberLabel,
      directorName: params.directorName,
      dialogStyle: params.dialogStyle,
    }),
  );

  lines.push(
    `You cannot write the Document. Do not say "I'll capture it now" or "I'll add a Point" as if the write already happened.`,
    `If a Point belongs on the Document, name the title, the Section (if you have one), and the body in one breath so ${params.directorName} can draft.update.propose.`,
    `If they ask you to name an item from the Dialog Document / a Path, quote ONLY a title or preview from the DIALOG DOCUMENT Points block in your system prompt. Never invent a title. Never treat a system-rule heading as a Document item. If you cannot find a matching Point, say you cannot name one.`,
  );

  return lines.join('\n');
}

function buildLeadJudgmentLines(directorName: string): string[] {
  return [
    `ORCHESTRATION CONTEXT — this is not the user's message. The human's direction is the user turn.`,
    `Orchestration context informs you. It does not impersonate the human.`,
    `Stay in the performance as Lead (${directorName}). Lead Judgment (role contract) governs your spoken response — not a recap.`,
    `A good Lead does not merely summarize what everyone said. A good Lead recognizes what the scene was actually about. Find the plot.`,
    `Do not enumerate Cast voices. Do not emit a Summary card of the room.`,
    `- Recognize what mattered, where Cast converged or conflicted, and what that means next.`,
    `- Identify consequence. Preserve meaningful tension when it is unresolved.`,
    `- Recognize decisions the human already made — do not reopen them as suggestions.`,
    `- Move the performance forward. Do not report on the room.`,
    `- Do not write a committee report, a roll-call, or "Cloud and Rendr have identified…"`,
    `- Attribute a stance to a cast member ONLY when a real reply is listed — and then in a clause, not minutes.`,
    `- Dialog already shows each cast member's voice card. Do not paste ### headings or repeat Cast verbatim.`,
    `- Execution truth: intended next work may be future tense. Do not claim an action was initiated, completed, or running, or that findings were produced, unless a success receipt for that action is listed in this context.`,
    `- An error receipt means that action failed. Cast hopes ("starting", "pending", "initiated") are not results.`,
  ];
}

export function formatActionReceiptsForLead(receipts: Array<Record<string, unknown>> | undefined): string[] {
  if (!receipts?.length) {
    return [
      'Action receipts this turn: none.',
      'Cast prose is not execution. Do not report a tool, Probe, or evaluation as initiated, completed, or that findings were produced.',
    ];
  }

  const lines = ['Action receipts this turn (ground truth — use these, not Cast hopes):'];
  for (const row of receipts) {
    const data =
      row.data && typeof row.data === 'object' && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {};
    const who =
      (typeof row.attributedTo === 'string' && row.attributedTo.trim())
      || (typeof data.attributedTo === 'string' && data.attributedTo.trim())
      || null;
    const type = typeof row.type === 'string' && row.type.trim() ? row.type.trim() : 'action';
    const status = typeof row.status === 'string' && row.status.trim() ? row.status.trim() : 'unknown';
    const code = typeof row.errorCode === 'string' && row.errorCode.trim() ? ` (${row.errorCode.trim()})` : '';
    const message = typeof row.message === 'string' ? row.message.trim() : '';
    const prefix = who ? `${who} · ${type}` : type;
    lines.push(`- ${prefix}: ${status}${code}${message ? ` — ${message}` : ''}`);
  }
  lines.push(
    'You may describe intended next work in future tense.',
    'Do not represent an action as initiated, completed, running, or that findings were produced unless a success receipt for that action is listed above.',
    'An error receipt means that action failed. Cast hopes ("starting", "pending", "initiated") are not results.',
  );
  return lines;
}

export function buildDirectorSynthesisPrompt(params: {
  userMessage: string;
  taskMessage?: string;
  castMemberLabel: string;
  castMemberReply: string;
  directorName: string;
  deliveredAdvice?: string | null;
  actionReceipts?: Array<Record<string, unknown>>;
}): string {
  const display = params.userMessage.trim();
  const task = params.taskMessage?.trim() || display;
  const isContinuation = task !== display;
  const delivered = params.deliveredAdvice?.trim();

  return [
    `[Orchestration context — ${params.directorName} after Cast]`,
    isContinuation
      ? `The human said "${display}" — continuing their prior request to ${params.castMemberLabel}.`
      : `The human may have addressed ${params.castMemberLabel} directly — that is expected when pinned.`,
    `Task in play: "${task}"`,
    '',
    `${params.castMemberLabel} (Cast) contributed:`,
    `"${params.castMemberReply}"`,
    delivered
      ? `Delivered to the human (Dialog already shows this):\n${delivered}`
      : `${params.castMemberLabel} delivered only the prose above — no separate advisory card crossed to the human.`,
    '',
    ...formatActionReceiptsForLead(params.actionReceipts),
    '',
    ...buildLeadJudgmentLines(params.directorName),
    `- If ${params.castMemberLabel} said they would capture or add a Point, they cannot write the Document. You emit draft.update.propose this turn. Use payload.section when they named a Section.`,
    `- Do NOT claim ${params.castMemberLabel} provided a report, card, or artifact unless it is listed as delivered above.`,
    `- Do NOT treat "I will give you the report" as delivery.`,
    `- Do NOT correct the user about who they addressed.`,
    `- Do NOT tell the user to "try ${params.castMemberLabel} again" or to flag routing issues.`,
    `- Do NOT claim this session starts cold or that earlier thread turns are unavailable — they are in context.`,
  ].join('\n');
}

export function buildDirectorFallbackSynthesisPrompt(params: {
  userMessage: string;
  taskMessage?: string;
  castMemberLabel: string;
  directorName: string;
  actionReceipts?: Array<Record<string, unknown>>;
}): string {
  const display = params.userMessage.trim();
  const task = params.taskMessage?.trim() || display;
  const isContinuation = task !== display;

  return [
    `[Orchestration context — ${params.directorName} after empty Cast]`,
    isContinuation
      ? `The human said "${display}" — continuing their prior request to ${params.castMemberLabel}.`
      : `The human addressed ${params.castMemberLabel}.`,
    `Task in play: "${task}"`,
    '',
    `${params.castMemberLabel} did not return a reply this turn.`,
    '',
    ...formatActionReceiptsForLead(params.actionReceipts),
    '',
    ...buildLeadJudgmentLines(params.directorName),
    `- Say plainly that you reached out to ${params.castMemberLabel} and got nothing back.`,
    `- Do NOT invent, paraphrase, or role-play ${params.castMemberLabel}'s voice or opinion.`,
    `- Do NOT claim ${params.castMemberLabel} said, decided, or agreed to anything.`,
    `- Answer the human's direction from your own knowledge only, and mark that clearly if you do.`,
    `- Do NOT claim this session starts cold or that earlier thread turns are unavailable.`,
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
    deliveredAdvice?: string | null;
  }>;
  castPromisedPointWrite?: boolean;
  /** Human asked the Lead to review / reorganize / direct the Document. */
  documentDirection?: boolean;
  /** Stage + Cast performance — emit resolvedMeaning on the envelope, not by rewriting response. */
  resolvePerformanceMeaning?: boolean;
  /** Cast action receipts this turn — ground truth for what ran. */
  actionReceipts?: Array<Record<string, unknown>>;
}): string {
  const lines = [
    `[Orchestration context — ${params.directorName} after Cast performance]`,
    `The human's direction (also the user turn — respond to that, not to this block):`,
    `"${params.userMessage.trim()}"`,
    '',
    'Cast performance results (use ONLY these — never invent missing voices):',
  ];

  for (const row of params.consultations) {
    if (row.status === 'ok' && (row.reply?.trim() || row.deliveredAdvice?.trim())) {
      lines.push(`- ${row.label}: "${(row.reply ?? '').trim() || '(prose empty — advisory card delivered)'}"`);
      if (row.deliveredAdvice?.trim()) {
        lines.push(`  Delivered advisory card:\n${row.deliveredAdvice.trim()}`);
      } else {
        lines.push(`  No advisory card crossed to the human.`);
      }
    } else {
      lines.push(`- ${row.label}: (nothing returned — say you got nothing back)`);
    }
  }

  lines.push(
    '',
    ...formatActionReceiptsForLead(params.actionReceipts),
    '',
    ...buildLeadJudgmentLines(params.directorName),
    '- Do NOT claim a cast member provided a report, card, or artifact unless it is listed as delivered above.',
    '- Do NOT treat "I will give you the report" as delivery.',
    '- If a cast member returned nothing, say plainly you got nothing back from them.',
    '- Never invent, paraphrase-as-quote, or fabricate another agent\'s words.',
    '- Do not invent unanimous consensus. If replies disagree or are empty, say so plainly.',
    '- When the human asked for a Document Path item, only relay titles that appear in a real consult reply or in the DIALOG DOCUMENT Points block — never invent a shared title.',
    params.documentDirection
      ? '- YOU are the Director of this Document. Cast replies are evidence, not your answer. Do not report what Cloud or Rendr think. Propose the rearrangement: emit document.reorganize.propose this turn. Move, section, refine, or name what belongs where. Chronicle Apply is the human.'
      : '- A named Section is draft.update.propose with payload.section. Never document.reorganize.propose to add a Section. Never draft.point.accept — Accept is a human Chronicle action.',
  );

  if (params.documentDirection) {
    lines.push(
      '- Do not narrate that you will propose later. The proposal is this turn.',
      '- Do not ask the human to cue Cast again. You own the Document move.',
    );
  }

  if (params.castPromisedPointWrite) {
    lines.push(
      '- A cast member said they would capture/add a Point. They cannot write the Document. You must emit draft.update.propose this turn.',
      '- Use payload.section when they named a Section (e.g. Keeper Stage). payload.prelude is the short title. payload.content is the Point body (Rendr\'s line, the design principle — whatever they offered).',
      '- Short prose + the action. Do not sit silent after they promised a write. If the write fails, say so.',
    );
  }

  if (params.resolvePerformanceMeaning) {
    lines.push(
      '',
      'RESOLVED MEANING (Stage performance — envelope sibling, not your spoken reply):',
      '- Also emit "resolvedMeaning": { "meaning": "...", "because?": "...", "about": [{ "kind", "id", "title?" }], "performedBy": ["slug"] }.',
      '- Spoken "response" stays in the performance as Lead. resolvedMeaning records what emerged — it is not a summary of Cast.',
      '- "meaning" is what emerged — insight, question, tension, possibility, decision, or direction. It must not be a restatement of "response".',
      '- "about" references Keeper objects on Stage or in Talking in / Working on (ids + optional titles). Do not copy Point or Document bodies.',
      '- "performedBy" is slugs that actually delivered this turn. Never invent a voice.',
      '- If nothing resolved, omit resolvedMeaning. Do not invent meaning so a Frame can appear.',
      '- Do not emit stage.story.layout for this. Expression is not your job this turn.',
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
