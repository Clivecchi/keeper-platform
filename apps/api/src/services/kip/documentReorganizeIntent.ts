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
  /\b(update|updating|rewrite|rewriting|write|writing|revise|revising|change|changing|set) (the |this )?(forward|title)\b/i,
  /\brename (the |this )?(document|dialog|title)\b/i,
  /\b(document|dialog) (name|title)\b/i,
  /\bforward (field|title|specifically)\b/i,
  /\b(every|all) points?.{0,80}\bopen\b/i,
  /\bsection called ["']?open\b/i,
  /\binto (a )?(single )?section called ["']?open\b/i,
  /\bmoving every point\b/i,
  /\b(that'?s|that is) (useless|not (a |the )?(proposal|reorganization|reorganisation))\b/i,
  /\b(nothing|anything) (actually |really )?(changed|different)\b/i,
  /\bno (meaningful |real |actual )?change\b/i,
  /\b(the )?same (document|thing|proposal)\b/i,
  /\bcopy.?paste[d]?\b/i,
  /\bdid (you|it|kip) (even )?change\b/i,
  /\brestat(e|ed|ement|es)\b/i,
  /\b(do not|don'?t) (necessarily )?belong\b/i,
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

function resultFlag(
  data: unknown,
  key: 'spineOnly' | 'openDumpRepaired' | 'oneSectionDumpRepaired' | 'restatement',
): boolean {
  return Boolean(
    data
    && typeof data === 'object'
    && !Array.isArray(data)
    && (data as Record<string, unknown>)[key] === true,
  );
}

export function isSpineOnlyReorganizeResult(results: ActionResultLite[]): boolean {
  return results.some(
    (result) =>
      result.type === 'document.reorganize.propose'
      && result.status === 'success'
      && resultFlag(result.data, 'spineOnly'),
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
    'If they asked to rename the Document or write the Forward, put those on the payload: title, forward: { title, description }.',
    'Do not draft.update.propose a Point that is actually the Forward or the Document name.',
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
  if (!params.isLead) return false;
  return params.actionResults.some(
    (result) =>
      result.type === 'document.reorganize.propose'
      && result.status === 'success'
      && (
        resultFlag(result.data, 'spineOnly')
        || resultFlag(result.data, 'openDumpRepaired')
        || resultFlag(result.data, 'oneSectionDumpRepaired')
      ),
  );
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
    'Keep those named Sections — you may add one if the story needs it, or rename/reorder them.',
    'Place each Point where it should live in the proposed Document: nest it under a Section, or { id: "<number or title from DIALOG DOCUMENT>", sectionId: "<Section title>", change: "move" }.',
    'Do not park all newly arrived or Open Points in one existing Section. Create a Section from their source or titles, or keep them in Open.',
    'You may refine, merge (replacesPointIds), retire, or add a Point (change: new). Split by adding new and refining or retiring the source.',
    'Prefer nesting Points under each Section. Do not emit a Section named Open.',
    'Never dump named work into Open. Open is only for Points that do not yet fit.',
    'Do not invent UUIDs. Do not only send Sections. Do not essay a mutation list.',
    '',
    `Your prior message: "${params.priorResponseText.trim().slice(0, 600)}"`,
  ].join('\n');
}

export function shouldRunReorganizeRestatementFollowUp(params: {
  isLead: boolean;
  actionResults: ActionResultLite[];
}): boolean {
  if (!params.isLead) return false;
  if (shouldRunReorganizePlacementFollowUp(params)) return false;
  return params.actionResults.some(
    (result) =>
      result.type === 'document.reorganize.propose'
      && result.status === 'success'
      && resultFlag(result.data, 'restatement'),
  );
}

export function buildReorganizeRestatementFollowUpInput(params: {
  agentName: string;
  dialogTitle?: string;
  priorResponseText: string;
}): string {
  const named = params.dialogTitle?.trim() ? ` "${params.dialogTitle.trim()}"` : '';
  return [
    `[Review & Reorganize restated Current — reply as ${params.agentName}.]`,
    '',
    `Your proposal for${named} did not change the Document. Chronicle Current and Proposed are the same.`,
    'Emit document.reorganize.propose again now.',
    'Propose a better information architecture — not the same Sections with the same Points.',
    'Move Points, create or rename Sections, refine, merge, or retire. Nest each Point under the Section it should belong to.',
    'Do not list the current Document and call it a reorganization.',
    'Never dump named work into Open.',
    '',
    `Your prior message: "${params.priorResponseText.trim().slice(0, 600)}"`,
  ].join('\n');
}

export function humanReorganizeFailureNotice(
  results: Array<{ type?: string; status?: string }>,
): string | null {
  if (!results.some((result) => result.type === 'document.reorganize.propose' && result.status === 'error')) {
    return null;
  }
  return 'The proposed Document did not land. Named Sections stay. Open is only for Points that do not yet fit.';
}

export function buildReorganizeProposeSystemPrompt(dialogTitle?: string): string {
  const named = dialogTitle?.trim() ? ` "${dialogTitle.trim()}"` : '';
  return [
    `REVIEW & REORGANIZE — propose the better Document${named}. Current is evidence, not a constraint.`,
    'You may review → understand → propose. Do not silently rewrite accepted work. Chronicle shows Current vs Proposed; the human Applies.',
    'Emit document.reorganize.propose in this turn. Do not rewrite accepted Points with draft.point.rewrite.',
    'Do not draft.update.propose. Review & Reorganize is not a Point write.',
    'Do not essay a mutation list. Chronicle will show the proposed Document with marks: New · Refined · Moved from… · Merged · Retire.',
    'Propose a better information architecture when the current one is weak. You may: keep a Point where it belongs; move a Point to another Section; create, rename, or reorder Sections and place Points into them; refine wording; merge redundant Points (change: merge + replacesPointIds); split by adding change: new and refining or retiring the source; retire superseded Points; change title and Forward.',
    'Payload: { rationale?, title?, forward?: { title, description }, sections: [{ id, title, prelude? }], points: [{ id, prelude?, content, sectionId?, change, fromSectionId?, originalPrelude?, originalContent?, replacesPointIds? }] }.',
    'change is one of: unchanged | new | refine | move | merge | retire.',
    'Refer to existing Points by their number or title from DIALOG DOCUMENT. Keeper resolves identities — do not invent UUIDs.',
    'You may omit unchanged Points — Keeper fills them in. A new Point uses change "new".',
    'Document name is payload.title (or documentTitle). Forward is payload.forward: { title, description }. Those are not Points. Identity-only payloads are valid — Keeper keeps current Sections and Points.',
    'Do not draft.update.propose to change the Forward or the Document name.',
    'Nest Points under the Section they should belong to in Proposed, or set sectionId to that Section title (change: move).',
    'Omit sectionId only when you are not moving that Point — Keeper keeps the current Section as a safety default. That is not a preference for the current structure.',
    'Never dump named work into Open. Do not emit a Section named Open. Open is only for Points that do not yet fit — use sectionId "open" only for those.',
    'Do not park all newly arrived or Open Points in one existing Section (Implementation Contract, Keeper Stage, or any other). Create a Section from their source or titles when they arrived together.',
    'A Sections-only payload is accepted, then you must place the Points. Proposed should be a real Document, not empty headers or a single Open pile.',
  ].join('\n');
}
