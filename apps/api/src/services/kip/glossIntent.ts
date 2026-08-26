/**
 * Gloss intent — polish on a Point, not a rewrite and not a new Draft.
 * Chronicle Gloss and MCP gloss_write_turn already exist; Lead Dialog must
 * use the same write path.
 */

import { isLeadThreadReply } from '@keeper/shared';

export type GlossIntentKind = 'none' | 'required';

const GLOSS_PATTERNS = [
  /\bas a gloss\b/i,
  /\badd .{0,80}gloss\b/i,
  /\bgloss (to|on|for) (that |the |this |it )?(point|one)\b/i,
  /\bgloss to point\b/i,
  /\bdon['’]?t see the gloss\b/i,
  /\bno gloss\b/i,
  /\bI don['’]?t see the gloss\b/i,
  /\bweave .{0,40}into the (point )?body\b/i,
];

const PRIOR_OFFERED_GLOSS = /\bgloss\b/i;

export function detectGlossIntent(
  userInput: string,
  priorAgentMessage?: string | null,
): GlossIntentKind {
  const text = userInput?.trim() ?? '';
  if (!text) return 'none';
  if (GLOSS_PATTERNS.some((pattern) => pattern.test(text))) return 'required';
  if (
    isLeadThreadReply(text)
    && typeof priorAgentMessage === 'string'
    && PRIOR_OFFERED_GLOSS.test(priorAgentMessage)
  ) {
    return 'required';
  }
  return 'none';
}

export function shouldRunGlossFollowUp(params: {
  intent: GlossIntentKind;
  isTurnOwner: boolean;
  actionResults: Array<{ type: string; status: string }>;
}): boolean {
  if (!params.isTurnOwner || params.intent !== 'required') return false;
  return !params.actionResults.some(
    (result) => result.type === 'gloss.append' && result.status === 'success',
  );
}

export function buildGlossAppendSystemPrompt(): string {
  return [
    'GLOSS — the human asked to Gloss an existing Point.',
    'Gloss is depth on the Point. It is not a rewrite of the Point body. It is not a new Draft.',
    'Emit gloss.append in this turn.',
    'payload.pointId is 1, 2, 3… from DIALOG DOCUMENT, or the current title.',
    'payload.content is the Gloss text — the depth behind the Point, not a rewrite of the Point body.',
    'Do not draft.point.rewrite. Do not draft.create. Do not draft.setActive.',
    'Keeper stores Gloss on the Document Point. Chronicle shows it on the Point.',
  ].join('\n');
}

export function buildGlossAppendFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  dialogTitle?: string;
  priorResponseText: string;
}): string {
  const named = params.dialogTitle?.trim() ? ` "${params.dialogTitle.trim()}"` : '';
  return [
    `[Gloss unmet — reply as ${params.agentName}. Append the Gloss now.]`,
    '',
    `The human asked to Gloss a Point on${named}. Narration is not a Gloss.`,
    'Emit gloss.append now. payload.pointId is 1–N or the current title. payload.content is the Gloss.',
    'Do not rewrite the Point. Do not create a Draft. Do not put Gloss in the Point body.',
    '',
    `Your prior message did not land a Gloss: "${params.priorResponseText.trim().slice(0, 800)}"`,
    '',
    `Original user message: "${params.originalInput}"`,
  ].join('\n');
}

export function buildGlossTurnCard(params: {
  results: Array<{
    type: string;
    status: string;
    message?: string;
    data?: Record<string, unknown>;
  }>;
  dialogTitle?: string;
}): { type: 'summary' | 'error'; title: string; body?: string; items: string[] } | null {
  const gloss = params.results.filter((result) => result.type === 'gloss.append');
  if (!gloss.length) return null;
  const ok = gloss.filter((result) => result.status === 'success');
  const where = params.dialogTitle?.trim() ? ` · ${params.dialogTitle.trim()}` : '';
  if (ok.length) {
    const items = ok
      .map((result) => {
        const point = result.data?.point as { prelude?: unknown; number?: unknown } | undefined;
        const prelude = typeof point?.prelude === 'string' ? point.prelude.trim() : '';
        const preview = typeof result.data?.preview === 'string' ? result.data.preview.trim() : '';
        return prelude || preview || 'Gloss';
      })
      .filter(Boolean);
    return {
      type: 'summary',
      title: `Gloss added${where}`,
      body: 'On the Document Point — open Chronicle to read it.',
      items: items.slice(0, 4),
    };
  }
  const failed = gloss.filter((result) => result.status === 'error' || result.status === 'skipped');
  if (!failed.length) return null;
  return {
    type: 'error',
    title: `Gloss was not added${where}`,
    body: 'The Point was not glossed.',
    items: failed
      .map((result) => result.message?.trim() || 'Gloss did not land.')
      .slice(0, 4),
  };
}
