/**
 * Review & Reorganize intent — Lead may review → understand → propose.
 * Does not write Points. Does not Apply.
 */

export type ReorganizeIntentKind = 'none' | 'required';

const REORGANIZE_PATTERNS = [
  /\brevieww?\b.{0,80}re-?organi[sz]e\b/i,
  /\bre-?organi[sz]e (the |this |our )?(document|points?|sections?|manuscript)\b/i,
  /\bre-?organi[sz]ation\b/i,
  /\breview (the |this |our )document\b/i,
  /\bpropose (a )better (document|structure|organization|organisation)\b/i,
  /\bclean up (the |this )document\b/i,
  /\borgani[sz]e (the |these |our )(document|points?|sections?)\b/i,
  /\bbetter version of (the |this )document\b/i,
  /\bsuggest (a )?new title\b/i,
];

export function detectReorganizeIntent(userInput: string): ReorganizeIntentKind {
  const text = userInput?.trim() ?? '';
  if (!text) return 'none';
  return REORGANIZE_PATTERNS.some((pattern) => pattern.test(text)) ? 'required' : 'none';
}

type ActionResultLite = {
  type?: string;
  status?: string;
  data?: unknown;
};

function resultSpineOnly(data: unknown): boolean {
  return Boolean(
    data
    && typeof data === 'object'
    && !Array.isArray(data)
    && (data as { spineOnly?: unknown }).spineOnly === true,
  );
}

export function isSpineOnlyReorganizeResult(results: ActionResultLite[]): boolean {
  return results.some(
    (result) =>
      result.type === 'document.reorganize.propose'
      && result.status === 'success'
      && resultSpineOnly(result.data),
  );
}

export function shouldRunReorganizeProposeFollowUp(params: {
  intent: ReorganizeIntentKind;
  isTurnOwner: boolean;
  actionResults: ActionResultLite[];
}): boolean {
  if (!params.isTurnOwner || params.intent !== 'required') return false;
  return !params.actionResults.some(
    (result) => result.type === 'document.reorganize.propose' && result.status === 'success',
  );
}

export function buildReorganizeProposeFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  dialogTitle?: string;
  priorResponseText: string;
}): string {
  const named = params.dialogTitle?.trim() ? ` "${params.dialogTitle.trim()}"` : '';
  return [
    `[Review & Reorganize unmet — reply as ${params.agentName}. Propose the Document now.]`,
    '',
    `The human asked you to review and reorganize${named}. Narration is not a proposal.`,
    'Emit document.reorganize.propose in this turn.',
    'Do not draft.update.propose. Do not delegate.consult. You are the Lead — do the Document work.',
    'If they asked for a new title, put the candidate in rationale and in your short response.',
    'Refer to existing Points by number or title from DIALOG DOCUMENT.',
    '',
    `Your prior message did not land a proposal: "${params.priorResponseText.trim().slice(0, 800)}"`,
    '',
    `Original user message: "${params.originalInput}"`,
  ].join('\n');
}

export function shouldRunReorganizePlacementFollowUp(params: {
  isLead: boolean;
  actionResults: ActionResultLite[];
}): boolean {
  return params.isLead && isSpineOnlyReorganizeResult(params.actionResults);
}

export function buildReorganizePlacementFollowUpInput(params: {
  agentName: string;
  dialogTitle?: string;
  priorResponseText: string;
}): string {
  const named = params.dialogTitle?.trim() ? ` "${params.dialogTitle.trim()}"` : '';
  return [
    `[Review & Reorganize incomplete — reply as ${params.agentName}.]`,
    '',
    `You named Sections for${named} but did not place any Points. Chronicle cannot show a better Document from headers alone.`,
    'Emit document.reorganize.propose again now.',
    'Keep the same Sections.',
    'Place every existing Point that belongs in a named Section: { id: "<number or title from DIALOG DOCUMENT>", sectionId: "<Section title>", change: "move" }.',
    'You may refine wording (change: refine) or retire a Point (change: retire).',
    'Do not invent UUIDs. Do not only send Sections. Do not essay a mutation list.',
    '',
    `Your prior message: "${params.priorResponseText.trim().slice(0, 600)}"`,
  ].join('\n');
}

export function buildReorganizeProposeSystemPrompt(dialogTitle?: string): string {
  const named = dialogTitle?.trim() ? ` "${dialogTitle.trim()}"` : '';
  return [
    `REVIEW & REORGANIZE — the human asked you to review the current Dialog Document${named}.`,
    'You may review → understand → propose. You must not silently restructure accepted work.',
    'Emit document.reorganize.propose in this turn. Do not rewrite accepted Points with draft.point.rewrite.',
    'Do not draft.update.propose. Review & Reorganize is not a Point write.',
    'Do not essay a mutation list. Chronicle will show the proposed Document.',
    'Payload: { rationale?, sections: [{ id, title, prelude? }], points: [{ id, prelude?, content, sectionId?, change, fromSectionId?, originalPrelude?, originalContent?, replacesPointIds? }] }.',
    'change is one of: unchanged | new | refine | move | merge | retire.',
    'Refer to existing Points by their number or title from DIALOG DOCUMENT. Keeper resolves identities — do not invent UUIDs.',
    'You may omit unchanged Points — Keeper fills them in. A new Point uses change "new".',
    'If they asked for a new title, put the candidate in rationale and in your short response. Title is not a Point.',
    'A Sections-only payload is accepted. Better: put Points under each Section (title or number) so Proposed is a real Document, not empty headers.',
    'Open is the quieter Section — use sectionId "open" or omit for unplaced Points.',
  ].join('\n');
}
