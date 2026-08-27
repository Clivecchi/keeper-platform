/**
 * Explicit Keeper Point intent — first Agency obligation seam.
 *
 * Detects when the human asked to add/propose Points to the active Dialog
 * Document, and when they constrained ("don't add yet").
 * Follow-up + prompt builders reuse the draft-deferral pattern without a new framework.
 */

import {
  isDocumentBearingDialogTitleSource,
  resolvePointWriteTarget,
  resolveTalkingInWorkingOn,
} from '@keeper/shared';

export type PointIntentKind = 'none' | 'required' | 'constrained';

export type PointIntent = {
  kind: PointIntentKind;
};

export type PointObligationBlocker = 'no_dialog' | 'chatter' | 'no_manuscript';

export type PointWriteKind = 'document' | 'draft';

export type PointTurnObligation = {
  /** User asked to capture/add/propose Points. */
  required: boolean;
  /** User asked to discuss without writing. */
  constrained: boolean;
  dialogId?: string;
  dialogTitle?: string;
  /** Write-target draft id — Dialog manuscript or the focused working Draft. */
  manuscriptDraftId?: string;
  writeKind?: PointWriteKind;
  workingOnTitle?: string;
  blocker?: PointObligationBlocker;
};

export type PointObligationEnv = {
  dialogDocument?: {
    dialogId?: string;
    title?: string;
    titleSource?: string | null;
    manuscriptDraftId?: string;
  };
  activeDraft?: {
    id?: string;
    title?: string;
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
  /\bdon['’]?t add (any )?points yet\b/i,
  /\bdo not add (any )?points yet\b/i,
  /\bno points yet[,.]?\s*(don['’]?t|do not|without)\b/i,
  /\bdon['’]?t add anything\b/i,
  /\bdo not add anything\b/i,
  /\bdiscuss possible points\b/i,
  /\blet['’]?s discuss.{0,80}(point|points).{0,40}(don['’]?t|do not|without) (add|creat|write|captur)/i,
  /\bwithout (adding|creating|writing|capturing|proposing)\b/i,
  /\bbut don['’]?t add\b/i,
];

/** Human-visible turn text — never Point-intent on pasted supporting context or Echo scaffolds. */
export function humanTurnTextForIntent(
  input: string,
  displayContent?: string | null,
): string {
  const visible = displayContent?.trim();
  if (visible) return visible;
  return input?.trim() ?? '';
}

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
  /\bweren['’]?t able to propose\b/i,
  /\bdidn['’]?t (actually )?(propose|add) (the )?points?\b/i,
  /\bwhat document or draft did you propose\b/i,
  /^(and )?(again,? )?(still nothing|same behavior)\b/i,
  /\bjust (do it|fire (the )?action|propose)\b/i,
  /\ba points? worth captur/i,
  /\bpoints? worth captur/i,
  /\bthat is (most certainly )?a points?\b/i,
  /\bcapture (it|that|this) (now|as (a )?points?)\b/i,
  /\bcreate (a |the )?new section\b/i,
  /\bnew section (called|named|and call it)\b/i,
  /\bsection and call it\b/i,
  /\bi don['’]?t see the (new )?section\b/i,
  /\bskipped .{0,40}actions?\b/i,
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
  const activeDraftId =
    typeof environment?.activeDraft?.id === 'string' && environment.activeDraft.id.trim()
      ? environment.activeDraft.id.trim()
      : undefined;
  const activeDraftTitle =
    typeof environment?.activeDraft?.title === 'string' && environment.activeDraft.title.trim()
      ? environment.activeDraft.title.trim()
      : undefined;

  const coords = resolveTalkingInWorkingOn({
    dialogId,
    dialogTitle,
    dialogTitleSource: doc?.titleSource,
    draftId: activeDraftId,
    draftTitle: activeDraftTitle,
  });
  const writeTarget = resolvePointWriteTarget({
    talkingInWorkingOn: coords,
    manuscriptDraftId,
    activeDraftId,
  });

  // Working on a Draft — write there. Chatter + Draft is allowed. Do not invent a Document.
  if (writeTarget.writeKind === 'draft') {
    return {
      required: true,
      constrained: false,
      dialogId,
      dialogTitle,
      manuscriptDraftId: writeTarget.writeDraftId,
      writeKind: 'draft',
      workingOnTitle: activeDraftTitle ?? coords?.workingOn?.title ?? dialogTitle,
    };
  }

  if (!dialogId) {
    return { required: true, constrained: false, blocker: 'no_dialog' };
  }

  // Only treat explicit Chatter as blocked when there is no working Draft.
  if (doc?.titleSource && !isDocumentBearingDialogTitleSource(doc.titleSource)) {
    return {
      required: true,
      constrained: false,
      dialogId,
      dialogTitle,
      blocker: 'chatter',
    };
  }

  if (writeTarget.writeKind === 'none' || !manuscriptDraftId) {
    return {
      required: true,
      constrained: false,
      dialogId,
      dialogTitle,
      writeKind: 'document',
      workingOnTitle: dialogTitle,
      blocker: 'no_manuscript',
    };
  }

  return {
    required: true,
    constrained: false,
    dialogId,
    dialogTitle,
    manuscriptDraftId: writeTarget.writeDraftId,
    writeKind: 'document',
    workingOnTitle: dialogTitle,
  };
}

const KEEPER_POINT_GROUNDING = [
  'KEEPER POINT (platform object — not layout, not a spatial/design point):',
  'A Point is a durable Document/Draft beat stored in kip_drafts.spec_json.points.',
  'Write target is Working on: the focused Draft if Chronicle is on a Draft; otherwise the Dialog Document manuscript.',
  'Talking in (the Dialog/session) is conversation context — do not write the Dialog manuscript just because the session still belongs to that Dialog.',
  'Never pick a different Dialog or Draft from draftsDirectory, session history, or memory. Working on is the only write target.',
  'Do not announce that you will read or propose. Emit draft.update.propose in this turn. A read without a propose is not completion.',
  'Never ask "want me to add that as a Point?" The card is the proposal. The human Accepts in Dialog. Asking is not completion.',
  'Chronicle renders those Points. Gloss threads are not Points.',
  'When the human asks to propose/add/capture Points, they mean this object.',
  'Point content is the beat only — never Domain Contract, action-schema rules, draft UUIDs, Prisma, or executor errors.',
  'Keeper fills the write-target id. Emit draft.update.propose with payload.content only.',
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
        obligation.writeKind === 'draft'
          ? `Working on Draft: ${obligation.workingOnTitle ?? 'this Draft'}. Talking in: ${obligation.dialogTitle ?? 'this conversation'}.`
          : `Working on Document: ${obligation.workingOnTitle ?? obligation.dialogTitle ?? 'this Document'}. Talking in: ${obligation.dialogTitle ?? 'this Dialog'}.`,
        'Keeper already has the write-target id — do not invent payload.id / payload.draftId.',
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
      'Talking in / Working on in the system prompt is the subject. DIALOG DOCUMENT is conversation context — write Points only where Working on says.',
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
    'Before this Turn is complete, emit one or more draft.update.propose actions with payload.content for each Point.',
    'When the human named a Section, set payload.section to that exact title. Keeper creates the Section. Do not document.reorganize.propose. Do not draft.point.accept — Accept is a human Chronicle action.',
    'UI: "response" is 1–3 short sentences. Do not paste Cast replies or ### Cloud / ### Rendr roll-calls — Dialog already shows their voice cards. Points appear as cards from the actions, not as a markdown essay.',
    'You still choose the wording and how many Points are useful. Keeper requires that the write happens.',
    'Never claim Points were kept unless those actions ran and the human Accepted.',
  ].join('\n');
}

export function detectNamedSectionTitle(userInput: string): string | undefined {
  const text = userInput?.trim() ?? '';
  if (!text) return undefined;
  const patterns = [
    /\bsection(?:\s+and)?\s+call(?:ed)? it[,:]?\s*[“”"']?([^“”"'\n.]{2,80})/i,
    /\bnew section\s+(?:called|named)\s+[“”"']?([^“”"'\n.]{2,80})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const title = match?.[1]?.replace(/^[“”"']|[“”"']$/g, '').trim();
    if (title) return title.replace(/[.]+$/, '').trim();
  }
  return undefined;
}

export function hasSuccessfulPointPropose(
  results: Array<{ type: string; status: string }>,
): boolean {
  return results.some(
    (result) => result.type === 'draft.update.propose' && result.status === 'success',
  );
}

/** Cast promised a Document write they cannot perform — Lead must write. */
export function detectCastPromisedPointWrite(
  replies: Array<string | null | undefined>,
): boolean {
  const promised = [
    /\bi(?:['’]ll| will) capture\b/i,
    /\bcaptur(?:e|ing) it now\b/i,
    /\bi(?:['’]ll| will) (?:add|write|propose) (?:a |the |this |that )?points?\b/i,
    /\bi(?:['’]ll| will) (?:add|write) it\b/i,
    /\bi(?:['’]m| am) creat(?:e|ing)\b/i,
    /\bi(?:['’]ll| will) creat(?:e|ing)\b/i,
    /\bcreating the .{0,60}section now\b/i,
    /\bcreate a new section\b/i,
    /\bsetting up a new section\b/i,
  ];
  return replies.some((reply) => {
    const text = reply?.trim() ?? '';
    return Boolean(text) && promised.some((pattern) => pattern.test(text));
  });
}

const CAST_ROLL_CALL = /^#{1,3}\s+(Cloud|Rendr|Kip|Ceox|Ceos)\b/im;
const CAST_MINUTES =
  /\b(Cloud and Rendr|both agree|have identified|key areas to address|here['’]?s the synthesis)\b/i;

/** Lead synthesis must not paste Cast voice cards or committee minutes. */
export function stripLeadCastRollCall(text: string): string {
  const raw = text.trim();
  if (!raw) return raw;

  const heading = /^#{1,3}\s+(Cloud|Rendr|Kip|Ceox|Ceos)\b/i;
  const lines = raw.split('\n');
  const kept: string[] = [];
  let skippingHeadingBlock = false;
  for (const line of lines) {
    if (heading.test(line)) {
      skippingHeadingBlock = true;
      continue;
    }
    if (skippingHeadingBlock) {
      if (!line.trim()) {
        skippingHeadingBlock = false;
      }
      continue;
    }
    kept.push(line);
  }

  const candidate = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim() || raw;
  if (CAST_ROLL_CALL.test(candidate) || CAST_MINUTES.test(candidate)) {
    const sentences = candidate.split(/(?<=[.!?])\s+/).filter(Boolean);
    const clipped = sentences.slice(0, 2).join(' ').trim();
    if (clipped && clipped.length <= 360 && !heading.test(clipped)) return clipped;
  }
  return candidate;
}

const NESTED_CAST_PROMPT_PATTERN =
  /^\[(?:Director delegation|Agent Echo —|Platform collaboration —)/i;

/**
 * Who owns Point writes this run.
 * The addressed agent (including Rendr/Cloud as composer) is the turn owner.
 * Nested consults, director-delegation prompts, and Kip Echo only advise.
 */
export function resolvePointTurnActor(params: {
  input?: string | null;
  supportEcho?: boolean;
  nestedCastRun?: boolean;
}): 'lead' | 'cast' {
  if (params.supportEcho || params.nestedCastRun) return 'cast';
  const input = params.input?.trim() ?? '';
  if (input && NESTED_CAST_PROMPT_PATTERN.test(input)) return 'cast';
  return 'lead';
}

export function shouldRunPointObligationFollowUp(params: {
  obligation: PointTurnObligation;
  actionResults: Array<{ type: string; status: string }>;
  isTurnOwner: boolean;
}): boolean {
  if (!params.isTurnOwner) return false;
  if (!params.obligation.required || params.obligation.constrained) return false;
  if (!params.obligation.manuscriptDraftId) return false;
  return !hasSuccessfulPointPropose(params.actionResults);
}

const OFFERED_POINT_ASK =
  /\b(?:want me to add (?:that |it |this )?(?:as )?a points?|shall i (?:add|propose) (?:that |it |this )?(?:as )?a points?|should i (?:add|propose) (?:that |it )?(?:as )?a points?|add that as a points?\?)\b/i;
const OFFERED_GLOSS_ASK =
  /\b(?:want me to (?:add (?:it |that )?(?:as )?(?:a )?)?gloss|as a gloss|shall i gloss)\b/i;

export function agentAskedToAddPointInsteadOfProposing(responseText: string): boolean {
  const text = responseText?.trim() ?? '';
  if (!text) return false;
  if (OFFERED_GLOSS_ASK.test(text)) return false;
  return OFFERED_POINT_ASK.test(text);
}

export function shouldRunPointAskFollowUp(params: {
  isTurnOwner: boolean;
  glossRequired?: boolean;
  actionResults: Array<{ type: string; status: string }>;
  responseText: string;
  manuscriptDraftId?: string;
}): boolean {
  if (!params.isTurnOwner || params.glossRequired) return false;
  if (!params.manuscriptDraftId) return false;
  if (hasSuccessfulPointPropose(params.actionResults)) return false;
  return agentAskedToAddPointInsteadOfProposing(params.responseText);
}

export function buildPointAskFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  priorResponseText: string;
  manuscriptDraftId: string;
  dialogTitle?: string;
  dialogId?: string;
}): string {
  return [
    `[Point ask — reply as ${params.agentName}. Do not ask. Propose the Point as UI now.]`,
    '',
    KEEPER_POINT_GROUNDING,
    `Manuscript draft id: ${params.manuscriptDraftId}`,
    params.dialogId
      ? `Dialog: ${params.dialogTitle ?? 'this Dialog'} (${params.dialogId})`
      : `Dialog: ${params.dialogTitle ?? 'this Dialog'}`,
    '',
    `You asked the human whether to add a Point: "${params.priorResponseText.trim().slice(0, 800)}"`,
    '',
    `Original user message: "${params.originalInput}"`,
    'Emit draft.update.propose now. payload.content is the Point beat. Do not invent a draft id.',
    'Do not ask again. Keeper shows a card. The human Accepts. Do not draft.point.accept.',
    'Keep "response" to 1–3 short sentences.',
  ].join('\n');
}

export function buildPointObligationFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  priorResponseText: string;
  obligation: PointTurnObligation;
}): string {
  const section = detectNamedSectionTitle(params.originalInput);
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
    'Emit draft.update.propose now. payload.content is the Point beat. Do not invent a draft id.',
    'One action per Point. payload.content is required. Do not draft.create. Do not defer.',
    section
      ? `payload.section is "${section}". Keeper creates that Section. Do not document.reorganize.propose. Do not draft.point.accept.`
      : 'If they named a Section, payload.section is that title. Do not document.reorganize.propose. Do not draft.point.accept.',
    'Do not read another Dialog first. Working on is already in the system prompt.',
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
  workingOnTitle?: string;
  writeKind?: PointWriteKind;
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
  const whereTitle = (params.workingOnTitle ?? params.dialogTitle)?.trim();
  const where = whereTitle ? ` · ${whereTitle}` : '';
  const onWhat = params.writeKind === 'draft' ? 'On the working Draft' : 'On the Dialog Document';
  return {
    type: 'summary',
    title: `Added ${successful.length} ${noun}${where}`,
    body: `${onWhat} — open Chronicle to read the full beats.`,
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
  workingOnTitle?: string;
  writeKind?: PointWriteKind;
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
  const whereTitle = (params.workingOnTitle ?? params.dialogTitle)?.trim();
  const where = whereTitle ? ` · ${whereTitle}` : '';
  const notUpdated = params.writeKind === 'draft'
    ? 'The working Draft was not updated.'
    : 'The Dialog Document was not updated.';
  return {
    type: 'error',
    title: `Points were not added${where}`,
    body: notUpdated,
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
  workingOnTitle?: string;
  writeKind?: PointWriteKind;
}): PointContributionCard | null {
  const rewritten = params.results.filter(
    (result) => result.type === 'draft.point.rewrite' && result.status === 'success',
  );
  if (rewritten.length) {
    const items = rewritten
      .map((result) => pointPreviewFromResult(result))
      .filter((item): item is string => Boolean(item));
    const whereTitle = (params.workingOnTitle ?? params.dialogTitle)?.trim();
    const where = whereTitle ? ` · ${whereTitle}` : '';
    return {
      type: 'summary',
      title: `Rewrote ${rewritten.length === 1 ? 'Point' : 'Points'}${where}`,
      body: 'On the Dialog Document — open Chronicle to read it.',
      items: items.slice(0, 6),
    };
  }
  return buildPointContributionCard(params) ?? buildPointTurnFailureCard(params);
}

const CAST_DUMP_PATTERN = /^#{1,3}\s+(Cloud|Rendr|Kip|Ceox)\b/im;

export function applyPointTurnDialogCopy(params: {
  responseText: string;
  results: Array<{ type: string; status: string }>;
  dialogTitle?: string;
  obligationRequired?: boolean;
}): string {
  const cleaned = stripLeadCastRollCall(stripExecutorLeakFromDialogText(params.responseText));
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

const POINT_REWRITE_PATTERNS = [
  /\brename .{0,80}points?\b/i,
  /\brename the point\b/i,
  /\bretitle\b/i,
  /\brewrite .{0,80}(titles?|points?)\b/i,
];

export function detectPointRewriteIntent(userInput: string): 'none' | 'required' {
  const text = userInput?.trim() ?? '';
  if (!text) return 'none';
  return POINT_REWRITE_PATTERNS.some((pattern) => pattern.test(text)) ? 'required' : 'none';
}

export function shouldRunPointRewriteFollowUp(params: {
  intent: 'none' | 'required';
  isTurnOwner: boolean;
  actionResults: Array<{ type: string; status: string }>;
}): boolean {
  if (!params.isTurnOwner || params.intent !== 'required') return false;
  return !params.actionResults.some(
    (result) => result.type === 'draft.point.rewrite' && result.status === 'success',
  );
}

export function buildPointRewriteFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  dialogTitle?: string;
  priorResponseText: string;
}): string {
  const named = params.dialogTitle?.trim() ? ` "${params.dialogTitle.trim()}"` : '';
  return [
    `[Point rewrite unmet — reply as ${params.agentName}. Rewrite the Point titles now.]`,
    '',
    `The human asked to rename Points on${named}. Narration is not a rewrite.`,
    'Emit draft.point.rewrite now. payload.pointId is 1, 2, 3… from DIALOG DOCUMENT (or the current title).',
    'Do not put that number in payload.id. Omit payload.id on a Dialog Document.',
    'payload.prelude or payload.title is the new short story-label. Omit content to keep the body.',
    'One action per Point, or payload.points: [{ pointId, title }].',
    '',
    `Your prior message did not land a rewrite: "${params.priorResponseText.trim().slice(0, 800)}"`,
    '',
    `Original user message: "${params.originalInput}"`,
  ].join('\n');
}

export function buildPointRewriteSystemPrompt(): string {
  return [
    'RENAME / REWRITE POINTS — the human asked to change existing Point titles or bodies.',
    'Emit draft.point.rewrite in this turn. Do not only describe the titles.',
    'payload.pointId is 1, 2, 3… from DIALOG DOCUMENT, or the current title. That is the same identity Chronicle shows.',
    'The Dialog id is not a Point id. Do not put Point numbers in payload.id.',
    'payload.prelude or payload.title is the new short story-label. Omit content to keep the body.',
    'To rename every Point: one rewrite per Point, or payload.points: [{ pointId: 1, title }, { pointId: 2, title }, …].',
  ].join('\n');
}

