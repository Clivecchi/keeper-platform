/**
 * Explicit Keeper Point intent — first Agency obligation seam.
 *
 * Detects when the human asked to add/propose Points to the active Dialog
 * Document, and when they constrained ("don't add yet").
 * Follow-up + prompt builders reuse the draft-deferral pattern without a new framework.
 */

import { isDocumentBearingDialogTitleSource } from '@keeper/shared';

export type PointIntentKind = 'none' | 'required' | 'constrained';

export type PointIntent = {
  kind: PointIntentKind;
};

export type PointObligationBlocker = 'no_dialog' | 'chatter' | 'no_manuscript';

export type PointTurnObligation = {
  /** User asked to capture/add/propose Points. */
  required: boolean;
  /** User asked to discuss without writing. */
  constrained: boolean;
  dialogId?: string;
  dialogTitle?: string;
  manuscriptDraftId?: string;
  blocker?: PointObligationBlocker;
};

export type PointObligationEnv = {
  dialogDocument?: {
    dialogId?: string;
    title?: string;
    titleSource?: string | null;
    manuscriptDraftId?: string;
  };
};

const POINT_CONSTRAINT_PATTERNS = [
  /\bdon['’]?t add\b/i,
  /\bdo not add\b/i,
  /\bdon['’]?t create\b/i,
  /\bdo not create\b/i,
  /\bdon['’]?t (write|capture|propose|save)\b/i,
  /\bdo not (write|capture|propose|save)\b/i,
  /\bnothing yet\b/i,
  /\bnot yet\b/i,
  /\bno points yet\b/i,
  /\bdon['’]?t add anything\b/i,
  /\bdo not add anything\b/i,
  /\bdiscuss possible points\b/i,
  /\blet['’]?s discuss.{0,80}(point|points).{0,40}(don['’]?t|do not|without) (add|creat|write|captur)/i,
  /\bwithout (adding|creating|writing|capturing|proposing)\b/i,
  /\bbut don['’]?t add\b/i,
];

const POINT_REQUIRED_PATTERNS = [
  /\bpropose (a |the |some |these |those )?points?\b/i,
  /\badd (this|that|these|those|it) as (a )?points?\b/i,
  /\badd (a |these |those |some )?points?\b/i,
  /\bcapture[\s\S]{0,160}as points?\b/i,
  /\bcapture (the |these |those |some )?.{0,40}(conclusions?|findings?|points?)\b/i,
  /\bput (this|that|these|those|it) in(to)? the documents?\b/i,
  /\bmake (this|that|these|those|it) (a |into )?points?\b/i,
  /\bcreate (a |these |some )?points?\b/i,
  /\bwrite (a |these |some )?points?\b/i,
  /\badd (that|this|it) to the documents?\b/i,
  /\bsave (that|this|it|these) as (a )?points?\b/i,
  /\bcan you (create and )?add points?\b/i,
  /\bso propose a? points?\b/i,
];

const POINT_FALSE_POSITIVES = [
  /\bwhat['’]?s the point\b/i,
  /\bthe point is\b/i,
  /\bpoint of view\b/i,
  /\bpoint out\b/i,
  /\bstarting point\b/i,
  /\btipping point\b/i,
  /\bfocal point\b/i,
  /\bpower point\b/i,
  /\bdecimal point\b/i,
];

export function detectPointIntent(userInput: string): PointIntent {
  const text = userInput?.trim() ?? '';
  if (!text) return { kind: 'none' };

  if (POINT_CONSTRAINT_PATTERNS.some((pattern) => pattern.test(text))) {
    return { kind: 'constrained' };
  }

  if (POINT_FALSE_POSITIVES.some((pattern) => pattern.test(text))) {
    const requiredAnyway = POINT_REQUIRED_PATTERNS.some((pattern) => pattern.test(text));
    if (!requiredAnyway) return { kind: 'none' };
  }

  if (POINT_REQUIRED_PATTERNS.some((pattern) => pattern.test(text))) {
    return { kind: 'required' };
  }

  return { kind: 'none' };
}

export function resolvePointTurnObligation(
  userInput: string,
  environment?: PointObligationEnv | null,
): PointTurnObligation {
  const intent = detectPointIntent(userInput);
  if (intent.kind === 'constrained') {
    return { required: false, constrained: true };
  }
  if (intent.kind !== 'required') {
    return { required: false, constrained: false };
  }

  const doc = environment?.dialogDocument;
  const dialogId = typeof doc?.dialogId === 'string' && doc.dialogId.trim() ? doc.dialogId.trim() : undefined;
  const dialogTitle = typeof doc?.title === 'string' && doc.title.trim() ? doc.title.trim() : undefined;
  const manuscriptDraftId =
    typeof doc?.manuscriptDraftId === 'string' && doc.manuscriptDraftId.trim()
      ? doc.manuscriptDraftId.trim()
      : undefined;

  if (!dialogId) {
    return { required: true, constrained: false, blocker: 'no_dialog' };
  }

  // Only treat explicit Chatter as blocked. Missing titleSource + a manuscript
  // still means a Document target. Named Dialogs are user_set.
  if (doc?.titleSource && !isDocumentBearingDialogTitleSource(doc.titleSource)) {
    return {
      required: true,
      constrained: false,
      dialogId,
      dialogTitle,
      blocker: 'chatter',
    };
  }

  if (!manuscriptDraftId) {
    return {
      required: true,
      constrained: false,
      dialogId,
      dialogTitle,
      blocker: 'no_manuscript',
    };
  }

  return {
    required: true,
    constrained: false,
    dialogId,
    dialogTitle,
    manuscriptDraftId,
  };
}

const KEEPER_POINT_GROUNDING = [
  'KEEPER POINT (platform object — not layout, not a spatial/design point):',
  'A Point is a durable Document/Draft beat stored in kip_drafts.spec_json.points on the Dialog manuscript (kind document_manuscript).',
  'Chronicle renders those Points. Gloss threads are not Points. Working drafts are not the Dialog Document.',
  'When the human asks to propose/add/capture Points, they mean this object.',
].join('\n');

export function buildPointObligationSystemPrompt(
  obligation: PointTurnObligation,
  actor: 'lead' | 'cast',
): string | null {
  if (obligation.constrained) {
    return [
      KEEPER_POINT_GROUNDING,
      'CONSTRAINT: the human asked to discuss possible Points but not to write any.',
      'Do not emit draft.update.propose, draft.create, or draft.point.rewrite this turn.',
    ].join('\n');
  }

  if (!obligation.required) return null;

  const targetLines = obligation.manuscriptDraftId
    ? [
        `Active Dialog: ${obligation.dialogTitle ?? 'this Dialog'} (${obligation.dialogId}).`,
        `Manuscript draft id (required as draft.update.propose payload.id / payload.draftId): ${obligation.manuscriptDraftId}`,
        'Do not create a new Draft. Do not use draft.create. Do not write Gloss instead of Points.',
      ]
    : [];

  if (actor === 'cast') {
    return [
      KEEPER_POINT_GROUNDING,
      ...targetLines,
      'This Turn has an explicit Point request. Advise in your specialty so the Lead can draft.update.propose.',
      'UI: two sentences maximum. No reports, no layout essays, no ### headings. Dialog already shows your voice card.',
      'Do not interpret “Point” as spatial ratio, motion, or layout unless they clearly asked about Treatment.',
      'If DIALOG DOCUMENT is in this prompt, that is the subject — do not ask what the Dialog is about.',
    ].join('\n');
  }

  if (obligation.blocker === 'no_dialog') {
    return [
      KEEPER_POINT_GROUNDING,
      'OBLIGATION blocked: there is no active named Dialog. Do not invent a Draft. Tell the human Points need a named Dialog Document.',
    ].join('\n');
  }
  if (obligation.blocker === 'chatter') {
    return [
      KEEPER_POINT_GROUNDING,
      'OBLIGATION blocked: this session is Chatter, not a named Dialog Document. Do not create a working Draft as a substitute. Say so honestly.',
    ].join('\n');
  }
  if (obligation.blocker === 'no_manuscript') {
    return [
      KEEPER_POINT_GROUNDING,
      'OBLIGATION blocked: the named Dialog has no document_manuscript. Do not create a working Draft. Say the Document has no manuscript yet.',
    ].join('\n');
  }

  return [
    KEEPER_POINT_GROUNDING,
    'TURN OBLIGATION (Keeper-owned, not optional): the human explicitly asked to add/propose Points.',
    ...targetLines,
    'Before this Turn is complete, emit one or more draft.update.propose actions with that manuscript id and payload.content for each Point.',
    'UI: "response" is 1–3 short sentences. Do not paste Cast replies or ### Cloud / ### Rendr roll-calls — Dialog already shows their voice cards. Points appear as cards from the actions, not as a markdown essay.',
    'You still choose the wording and how many Points are useful. Keeper requires that the write happens.',
    'Never claim Points were added unless those actions are in this response.',
  ].join('\n');
}

export function hasSuccessfulPointPropose(
  results: Array<{ type: string; status: string }>,
): boolean {
  return results.some(
    (result) => result.type === 'draft.update.propose' && result.status === 'success',
  );
}

export function shouldRunPointObligationFollowUp(params: {
  obligation: PointTurnObligation;
  actionResults: Array<{ type: string; status: string }>;
  isLead: boolean;
}): boolean {
  if (!params.isLead) return false;
  if (!params.obligation.required || params.obligation.constrained) return false;
  if (!params.obligation.manuscriptDraftId) return false;
  return !hasSuccessfulPointPropose(params.actionResults);
}

export function buildPointObligationFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  priorResponseText: string;
  obligation: PointTurnObligation;
}): string {
  return [
    `[Point obligation unmet — reply as ${params.agentName}. Complete the Point writes now.]`,
    '',
    KEEPER_POINT_GROUNDING,
    `Manuscript draft id: ${params.obligation.manuscriptDraftId}`,
    `Dialog: ${params.obligation.dialogTitle ?? 'this Dialog'} (${params.obligation.dialogId})`,
    '',
    `Your prior message did not successfully draft.update.propose: "${params.priorResponseText.trim().slice(0, 800)}"`,
    '',
    `Original user message: "${params.originalInput}"`,
    'Emit draft.update.propose now with payload.id set to the manuscript id above.',
    'One action per Point. payload.content is required. Do not draft.create. Do not defer.',
    'Keep "response" to 1–3 short sentences. Do not paste Cast replies.',
  ].join('\n');
}

export function buildPointObligationBlockedNotice(obligation: PointTurnObligation): string | null {
  if (!obligation.required || obligation.constrained) return null;
  if (obligation.blocker === 'no_dialog') {
    return 'I cannot add Points — there is no named Dialog Document in this Turn. Open or name a Dialog first.';
  }
  if (obligation.blocker === 'chatter') {
    return 'I cannot add Points here — this is Chatter, not a named Dialog Document. Name the Dialog if you want a Document.';
  }
  if (obligation.blocker === 'no_manuscript') {
    return 'I cannot add Points — this Dialog has no Document manuscript yet. I will not create a separate working Draft as a substitute.';
  }
  return null;
}

export function buildPointObligationUnmetNotice(results: Array<{
  type: string;
  status: string;
  message?: string;
}>): string {
  const propose = results.filter((result) => result.type === 'draft.update.propose');
  if (!propose.length) {
    return 'I could not add Points this turn — no draft.update.propose ran. The Document was not updated.';
  }
  return 'I could not add Points this turn. The Document was not updated.';
}

const EXECUTOR_LEAK_PATTERN =
  /prisma\.|Error creating UUID|Inconsistent column data|invalid prisma|invocation:/i;

export function sanitizePointExecutorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return 'The Point was not added.';
  if (EXECUTOR_LEAK_PATTERN.test(trimmed)) {
    return 'The Point was not added — Keeper could not reach the Dialog Document.';
  }
  if (trimmed.length > 180) return `${trimmed.slice(0, 177).trim()}…`;
  return trimmed;
}

export function stripExecutorLeakFromDialogText(text: string): string {
  let next = text.trim();
  next = next.replace(/\s*I attempted draft work, but it did not complete:[\s\S]*$/i, '');
  next = next.replace(/\s*I attempted an action, but it failed:[\s\S]*$/i, '');
  next = next.replace(/\s*I could not add Points:[^\n]*$/i, '');
  next = next
    .split(/\n\n+/)
    .filter((paragraph) => !EXECUTOR_LEAK_PATTERN.test(paragraph) && !/EXECUTION_ERROR/i.test(paragraph))
    .join('\n\n')
    .trim();
  return next;
}

/** Prisma `kip_drafts.id` is UUID. Models often send `none` or the manuscript `key` (`manuscript-…`). */
export function isKipDraftUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function firstDraftUuid(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && isKipDraftUuid(candidate)) {
      return candidate.trim();
    }
  }
  return undefined;
}

export function applyManuscriptDraftIdToProposePayload(
  payload: Record<string, unknown>,
  manuscriptDraftId?: string | null,
  options?: { forceManuscript?: boolean },
): Record<string, unknown> {
  const out = { ...payload };
  const manuscript = firstDraftUuid(manuscriptDraftId);
  const existing = firstDraftUuid(out.id, out.draftId);
  const chosen = options?.forceManuscript ? (manuscript ?? existing) : (existing ?? manuscript);

  if (typeof out.id === 'string' && !isKipDraftUuid(out.id)) delete out.id;
  if (typeof out.draftId === 'string' && !isKipDraftUuid(out.draftId)) delete out.draftId;

  if (!chosen) return out;
  out.id = chosen;
  out.draftId = chosen;
  return out;
}

export function countSuccessfulPointProposes(
  results: Array<{ type: string; status: string }>,
): number {
  return results.filter(
    (result) => result.type === 'draft.update.propose' && result.status === 'success',
  ).length;
}

export type PointContributionCard = {
  type: 'summary' | 'error';
  title: string;
  body?: string;
  items: string[];
};

function pointPreviewFromResult(result: {
  data?: Record<string, unknown>;
  message?: string;
}): string | null {
  const data = result.data;
  const point = data?.point;
  if (point && typeof point === 'object' && !Array.isArray(point)) {
    const record = point as { prelude?: unknown; content?: unknown };
    const prelude = typeof record.prelude === 'string' ? record.prelude.trim() : '';
    const content = typeof record.content === 'string' ? record.content.trim() : '';
    if (prelude) return prelude;
    if (content) return content.length > 140 ? `${content.slice(0, 137)}…` : content;
  }
  const intended = typeof data?.content === 'string' ? data.content.trim() : '';
  if (intended) return intended.length > 140 ? `${intended.slice(0, 137)}…` : intended;
  return null;
}

export function buildPointContributionCard(params: {
  results: Array<{
    type: string;
    status: string;
    message?: string;
    data?: Record<string, unknown>;
  }>;
  dialogTitle?: string;
}): PointContributionCard | null {
  const successful = params.results.filter(
    (result) => result.type === 'draft.update.propose' && result.status === 'success',
  );
  if (!successful.length) return null;
  const items = successful
    .map((result) => pointPreviewFromResult(result))
    .filter((item): item is string => Boolean(item));
  if (!items.length) return null;
  const noun = successful.length === 1 ? 'Point' : 'Points';
  const where = params.dialogTitle?.trim() ? ` · ${params.dialogTitle.trim()}` : '';
  return {
    type: 'summary',
    title: `Added ${successful.length} ${noun}${where}`,
    body: 'On the Dialog Document — open Chronicle to read the full beats.',
    items,
  };
}

export function buildPointTurnFailureCard(params: {
  results: Array<{
    type: string;
    status: string;
    message?: string;
    data?: Record<string, unknown>;
  }>;
  dialogTitle?: string;
}): PointContributionCard | null {
  const failed = params.results.filter(
    (result) => result.type === 'draft.update.propose' && result.status === 'error',
  );
  if (!failed.length) return null;
  const items = [
    ...new Set(
      failed
        .map((result) => pointPreviewFromResult(result) || sanitizePointExecutorMessage(result.message || ''))
        .filter(Boolean),
    ),
  ];
  const where = params.dialogTitle?.trim() ? ` · ${params.dialogTitle.trim()}` : '';
  return {
    type: 'error',
    title: `Points were not added${where}`,
    body: 'The Dialog Document was not updated. Point wording stays on the cards — not in a Prisma receipt.',
    items: items.slice(0, 6),
  };
}

export function buildPointTurnCard(params: {
  results: Array<{
    type: string;
    status: string;
    message?: string;
    data?: Record<string, unknown>;
  }>;
  dialogTitle?: string;
}): PointContributionCard | null {
  return buildPointContributionCard(params) ?? buildPointTurnFailureCard(params);
}

const CAST_DUMP_PATTERN = /^#{1,3}\s+(Cloud|Rendr|Kip|Ceox)\b/im;

export function applyPointTurnDialogCopy(params: {
  responseText: string;
  results: Array<{ type: string; status: string }>;
  dialogTitle?: string;
  obligationRequired?: boolean;
}): string {
  const cleaned = stripExecutorLeakFromDialogText(params.responseText);
  const successCount = countSuccessfulPointProposes(params.results);
  if (successCount > 0) {
    return preferShortPointTurnResponse({
      responseText: cleaned,
      pointCount: successCount,
      dialogTitle: params.dialogTitle,
    });
  }
  if (!params.obligationRequired) return cleaned;
  const failed = params.results.some(
    (result) => result.type === 'draft.update.propose' && result.status === 'error',
  );
  if (!failed) return cleaned;
  const looksLikeCastDump = CAST_DUMP_PATTERN.test(cleaned) || (cleaned.match(/\n#{1,3}\s+/g)?.length ?? 0) >= 2;
  if (cleaned && !looksLikeCastDump && cleaned.length <= 280) return cleaned;
  const where = params.dialogTitle?.trim() ? ` to ${params.dialogTitle.trim()}` : '';
  return `I could not add Points${where}.`;
}

export function preferShortPointTurnResponse(params: {
  responseText: string;
  pointCount: number;
  dialogTitle?: string;
}): string {
  const text = params.responseText.trim();
  if (params.pointCount <= 0) return text;
  const looksLikeCastDump = CAST_DUMP_PATTERN.test(text) || (text.match(/\n#{1,3}\s+/g)?.length ?? 0) >= 2;
  const tooLong = text.length > 520;
  if (!looksLikeCastDump && !tooLong) return text;
  const noun = params.pointCount === 1 ? 'Point' : 'Points';
  const where = params.dialogTitle?.trim() ? ` to ${params.dialogTitle.trim()}` : '';
  return `Added ${params.pointCount} ${noun}${where}.`;
}

export function clampCastAdviceForPointTurn(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 320) return trimmed;
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  const clipped = sentences.slice(0, 2).join(' ').trim();
  if (clipped && clipped.length <= 360) return clipped;
  return `${trimmed.slice(0, 277).trim()}…`;
}

