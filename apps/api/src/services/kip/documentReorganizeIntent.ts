/**
 * Review & Reorganize intent — Lead may review → understand → propose.
 * Does not write Points. Does not Apply.
 */

export type ReorganizeIntentKind = 'none' | 'required';

const REORGANIZE_PATTERNS = [
  /\breview (and|&) reorgani[sz]e\b/i,
  /\breorgani[sz]e (the |this |our )?(document|points?|sections?)\b/i,
  /\breview (the |this |our )document\b/i,
  /\bpropose (a )better (document|structure|organization|organisation)\b/i,
  /\bclean up (the |this )document\b/i,
  /\borgani[sz]e (the |these |our )(document|points?|sections?)\b/i,
  /\bbetter version of (the |this )document\b/i,
];

export function detectReorganizeIntent(userInput: string): ReorganizeIntentKind {
  const text = userInput?.trim() ?? '';
  if (!text) return 'none';
  return REORGANIZE_PATTERNS.some((pattern) => pattern.test(text)) ? 'required' : 'none';
}

export function isSpineOnlyReorganizeResult(results: Array<{
  type?: string;
  status?: string;
  data?: { spineOnly?: boolean };
}>): boolean {
  return results.some(
    (result) =>
      result.type === 'document.reorganize.propose'
      && result.status === 'success'
      && result.data?.spineOnly === true,
  );
}

export function shouldRunReorganizePlacementFollowUp(params: {
  isLead: boolean;
  actionResults: Array<{ type?: string; status?: string; data?: { spineOnly?: boolean } }>;
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
    'Do not essay a mutation list. Chronicle will show the proposed Document.',
    'Payload: { rationale?, sections: [{ id, title, prelude? }], points: [{ id, prelude?, content, sectionId?, change, fromSectionId?, originalPrelude?, originalContent?, replacesPointIds? }] }.',
    'change is one of: unchanged | new | refine | move | merge | retire.',
    'Refer to existing Points by their number or title from DIALOG DOCUMENT. Keeper resolves identities — do not invent UUIDs.',
    'You may omit unchanged Points — Keeper fills them in. A new Point uses change "new".',
    'A Sections-only payload is accepted. Better: put Points under each Section (title or number) so Proposed is a real Document, not empty headers.',
    'Open is the quieter Section — use sectionId "open" or omit for unplaced Points.',
  ].join('\n');
}
