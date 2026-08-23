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
    'Open is the quieter Section — use sectionId "open" or omit for unplaced Points.',
  ].join('\n');
}
