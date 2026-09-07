/**
 * Keeping Choice — deferred semantic direction on agent_output.
 * Not an action (not executed this turn). Not a proposal (no staged mutation).
 */

export const KEEPING_CHOICE_MAX_PER_TURN = 6 as const;
export const KEEPING_CHOICE_LABEL_MAX_CHARS = 80 as const;
export const KEEPING_CHOICE_DIRECTION_MAX_CHARS = 400 as const;
export const KEEPING_CHOICE_MEANING_MAX_CHARS = 500 as const;
export const KEEPING_CHOICE_ABOUT_MAX_CHARS = 120 as const;

export type KeepingChoiceRefs = {
  dialogId?: string;
  pointId?: string;
  draftId?: string;
  manuscriptDraftId?: string;
  libraryItemId?: string;
  journeyId?: string;
  momentId?: string;
  keeperId?: string;
};

/** Agent-emitted. Nothing here is executed. No `kind`. */
export type KeepingChoiceOffer = {
  id?: string;
  label: string;
  direction: string;
  meaning?: string;
  about?: string;
  refs?: KeepingChoiceRefs;
};

export type KeepingChoiceSource = {
  messageId: string;
  sessionId: string;
  dialogId?: string | null;
  agentId?: string;
  agentSlug?: string;
  actor: string;
  offeredAt: string;
};

export type KeepingChoiceSelection = {
  selectedAt: string;
  resultingUserMessageId: string;
  resultingAgentMessageId?: string;
};

/** Persisted on kip_messages.metadata.keepingChoices */
export type KeepingChoiceRecord = {
  choiceId: string;
  localId?: string;
  label: string;
  direction: string;
  meaning?: string;
  about?: string;
  refs?: KeepingChoiceRefs;
  source: KeepingChoiceSource;
  selections: KeepingChoiceSelection[];
};

/** agentContext on the exercising Lead turn. */
export type KeepingChoiceExercise = {
  choiceId: string;
  sourceMessageId: string;
  label: string;
  direction: string;
  meaning?: string;
  about?: string;
  refs?: KeepingChoiceRefs;
  source: KeepingChoiceSource;
};

export type KeepingChoiceSelectionMeta = {
  choiceId: string;
  sourceMessageId: string;
  label: string;
  direction: string;
};

function clipped(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseRefs(raw: unknown): KeepingChoiceRefs | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const refs: KeepingChoiceRefs = {};
  const keys: Array<keyof KeepingChoiceRefs> = [
    'dialogId',
    'pointId',
    'draftId',
    'manuscriptDraftId',
    'libraryItemId',
    'journeyId',
    'momentId',
    'keeperId',
  ];
  for (const key of keys) {
    const value = clipped(rec[key], 80);
    if (value) refs[key] = value;
  }
  return Object.keys(refs).length ? refs : undefined;
}

export function parseKeepingChoiceOffer(raw: unknown): KeepingChoiceOffer | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const label = clipped(rec.label, KEEPING_CHOICE_LABEL_MAX_CHARS);
  const direction = clipped(rec.direction, KEEPING_CHOICE_DIRECTION_MAX_CHARS);
  if (!label || !direction) return null;
  const localId = clipped(rec.id, 64);
  const meaning = clipped(rec.meaning, KEEPING_CHOICE_MEANING_MAX_CHARS);
  const about = clipped(rec.about, KEEPING_CHOICE_ABOUT_MAX_CHARS);
  const refs = parseRefs(rec.refs);
  return {
    ...(localId ? { id: localId } : {}),
    label,
    direction,
    ...(meaning ? { meaning } : {}),
    ...(about ? { about } : {}),
    ...(refs ? { refs } : {}),
  };
}

export function parseKeepingChoiceOffers(raw: unknown): KeepingChoiceOffer[] {
  if (!Array.isArray(raw)) return [];
  const offers: KeepingChoiceOffer[] = [];
  for (const item of raw) {
    if (offers.length >= KEEPING_CHOICE_MAX_PER_TURN) break;
    const offer = parseKeepingChoiceOffer(item);
    if (offer) offers.push(offer);
  }
  return offers;
}

export function parseKeepingChoiceSource(raw: unknown): KeepingChoiceSource | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const messageId = clipped(rec.messageId, 80);
  const sessionId = clipped(rec.sessionId, 80);
  const actor = clipped(rec.actor, 120);
  const offeredAt = clipped(rec.offeredAt, 40);
  if (!messageId || !sessionId || !actor || !offeredAt) return null;
  const dialogId =
    rec.dialogId === null
      ? null
      : clipped(rec.dialogId, 80) ?? undefined;
  return {
    messageId,
    sessionId,
    ...(dialogId !== undefined ? { dialogId } : {}),
    ...(clipped(rec.agentId, 80) ? { agentId: clipped(rec.agentId, 80) } : {}),
    ...(clipped(rec.agentSlug, 64) ? { agentSlug: clipped(rec.agentSlug, 64) } : {}),
    actor,
    offeredAt,
  };
}

export function parseKeepingChoiceRecord(raw: unknown): KeepingChoiceRecord | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const choiceId = clipped(rec.choiceId, 80);
  const label = clipped(rec.label, KEEPING_CHOICE_LABEL_MAX_CHARS);
  const direction = clipped(rec.direction, KEEPING_CHOICE_DIRECTION_MAX_CHARS);
  const source = parseKeepingChoiceSource(rec.source);
  if (!choiceId || !label || !direction || !source) return null;
  const selections = Array.isArray(rec.selections)
    ? rec.selections
        .map((row) => {
          const item = asRecord(row);
          if (!item) return null;
          const selectedAt = clipped(item.selectedAt, 40);
          const resultingUserMessageId = clipped(item.resultingUserMessageId, 80);
          if (!selectedAt || !resultingUserMessageId) return null;
          const resultingAgentMessageId = clipped(item.resultingAgentMessageId, 80);
          return {
            selectedAt,
            resultingUserMessageId,
            ...(resultingAgentMessageId ? { resultingAgentMessageId } : {}),
          } satisfies KeepingChoiceSelection;
        })
        .filter((row): row is KeepingChoiceSelection => row !== null)
    : [];
  const localId = clipped(rec.localId, 64);
  const meaning = clipped(rec.meaning, KEEPING_CHOICE_MEANING_MAX_CHARS);
  const about = clipped(rec.about, KEEPING_CHOICE_ABOUT_MAX_CHARS);
  const refs = parseRefs(rec.refs);
  return {
    choiceId,
    ...(localId ? { localId } : {}),
    label,
    direction,
    ...(meaning ? { meaning } : {}),
    ...(about ? { about } : {}),
    ...(refs ? { refs } : {}),
    source,
    selections,
  };
}

export function parseKeepingChoiceRecords(raw: unknown): KeepingChoiceRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseKeepingChoiceRecord)
    .filter((row): row is KeepingChoiceRecord => row !== null);
}

export function stampKeepingChoiceRecords(
  offers: readonly KeepingChoiceOffer[],
  source: KeepingChoiceSource,
  idFactory: () => string,
): KeepingChoiceRecord[] {
  return offers.slice(0, KEEPING_CHOICE_MAX_PER_TURN).map((offer) => ({
    choiceId: idFactory(),
    ...(offer.id ? { localId: offer.id } : {}),
    label: offer.label,
    direction: offer.direction,
    ...(offer.meaning ? { meaning: offer.meaning } : {}),
    ...(offer.about ? { about: offer.about } : {}),
    ...(offer.refs ? { refs: offer.refs } : {}),
    source,
    selections: [],
  }));
}

export function isKeepingChoiceSelected(record: Pick<KeepingChoiceRecord, 'selections'>): boolean {
  return record.selections.length > 0;
}

export function canExerciseKeepingChoice(record: Pick<KeepingChoiceRecord, 'selections'>): boolean {
  return !isKeepingChoiceSelected(record);
}

export function applyKeepingChoiceSelection(
  records: readonly KeepingChoiceRecord[],
  choiceId: string,
  selection: KeepingChoiceSelection,
): { ok: true; records: KeepingChoiceRecord[] } | { ok: false; reason: 'missing' | 'already_selected'; records: KeepingChoiceRecord[] } {
  const index = records.findIndex((row) => row.choiceId === choiceId);
  if (index < 0) return { ok: false, reason: 'missing', records: [...records] };
  const current = records[index];
  if (isKeepingChoiceSelected(current)) {
    return { ok: false, reason: 'already_selected', records: [...records] };
  }
  const next = [...records];
  next[index] = {
    ...current,
    selections: [...current.selections, selection],
  };
  return { ok: true, records: next };
}

export function mergeKeepingChoiceAgentMessageId(
  records: readonly KeepingChoiceRecord[],
  choiceId: string,
  resultingAgentMessageId: string,
): KeepingChoiceRecord[] {
  return records.map((row) => {
    if (row.choiceId !== choiceId) return row;
    const last = row.selections[row.selections.length - 1];
    if (!last) return row;
    return {
      ...row,
      selections: [
        ...row.selections.slice(0, -1),
        { ...last, resultingAgentMessageId },
      ],
    };
  });
}

export function keepingChoiceRecordToExercise(record: KeepingChoiceRecord): KeepingChoiceExercise {
  return {
    choiceId: record.choiceId,
    sourceMessageId: record.source.messageId,
    label: record.label,
    direction: record.direction,
    ...(record.meaning ? { meaning: record.meaning } : {}),
    ...(record.about ? { about: record.about } : {}),
    ...(record.refs ? { refs: record.refs } : {}),
    source: record.source,
  };
}

export function parseKeepingChoiceExercise(raw: unknown): KeepingChoiceExercise | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const choiceId = clipped(rec.choiceId, 80);
  const sourceMessageId = clipped(rec.sourceMessageId, 80);
  const label = clipped(rec.label, KEEPING_CHOICE_LABEL_MAX_CHARS);
  const direction = clipped(rec.direction, KEEPING_CHOICE_DIRECTION_MAX_CHARS);
  const source = parseKeepingChoiceSource(rec.source);
  if (!choiceId || !sourceMessageId || !label || !direction || !source) return null;
  return {
    choiceId,
    sourceMessageId,
    label,
    direction,
    ...(clipped(rec.meaning, KEEPING_CHOICE_MEANING_MAX_CHARS)
      ? { meaning: clipped(rec.meaning, KEEPING_CHOICE_MEANING_MAX_CHARS) }
      : {}),
    ...(clipped(rec.about, KEEPING_CHOICE_ABOUT_MAX_CHARS)
      ? { about: clipped(rec.about, KEEPING_CHOICE_ABOUT_MAX_CHARS) }
      : {}),
    ...(parseRefs(rec.refs) ? { refs: parseRefs(rec.refs) } : {}),
    source,
  };
}

export function parseKeepingChoiceSelectionMeta(raw: unknown): KeepingChoiceSelectionMeta | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const choiceId = clipped(rec.choiceId, 80);
  const sourceMessageId = clipped(rec.sourceMessageId, 80);
  const label = clipped(rec.label, KEEPING_CHOICE_LABEL_MAX_CHARS);
  const direction = clipped(rec.direction, KEEPING_CHOICE_DIRECTION_MAX_CHARS);
  if (!choiceId || !sourceMessageId || !label || !direction) return null;
  return { choiceId, sourceMessageId, label, direction };
}

/** Model-facing user input for an exercised choice. */
export function formatKeepingChoiceLeadInput(record: KeepingChoiceExercise | KeepingChoiceRecord): string {
  const lines = [
    'The human selected a keeping judgment from an earlier Turn.',
    'Do not replay a stored mutation. Re-evaluate against current Keeper truth and keep it appropriately.',
    '',
    `Label: ${record.label}`,
    `Direction: ${record.direction}`,
  ];
  if (record.meaning?.trim()) lines.push(`Meaning: ${record.meaning.trim()}`);
  if (record.about?.trim()) lines.push(`About: ${record.about.trim()}`);
  const source = 'source' in record ? record.source : undefined;
  if (source) {
    lines.push(
      `Source: message ${source.messageId} · dialog ${source.dialogId ?? 'none'} · offered by ${source.actor}`,
    );
  }
  return lines.join('\n');
}

/** System-block for the exercising turn — direction, not a capability obligation. */
export function buildKeepingChoiceExercisePrompt(exercise: KeepingChoiceExercise): string {
  return [
    'KEEPING CHOICE (human-selected, Keeper-owned):',
    'The human selected this keeping judgment from an earlier Turn.',
    'This is semantic direction, not a predetermined capability.',
    'Re-evaluate against current Talking in / Working on / Stage / Document truth.',
    'Then Act, Propose, Advise, Notice, or Leave As-Is as appropriate.',
    'Do not invent a mutation because a choice was selected. Do not sole.save merely because a choice was selected.',
    `Label: ${exercise.label}`,
    `Direction: ${exercise.direction}`,
    exercise.meaning ? `Meaning: ${exercise.meaning}` : '',
    exercise.about ? `About: ${exercise.about}` : '',
    `Source message: ${exercise.sourceMessageId} (provenance, not a forced write destination).`,
  ]
    .filter(Boolean)
    .join('\n');
}

export const KEEPING_CHOICE_STORY_BUILDER_RULE = [
  'KEEPING CHOICES vs DIRECTED KEEPS:',
  'If the human already directed a known keep act (add a Point, rewrite, Gloss, reorganize, layout the story, generate an image), complete this turn with the authorized action or proposal. The card is consent. Do not substitute keepingChoices for that act.',
  'If the human was speaking naturally and did not authorize a specific keep act, and you recognize keep-worthy meanings, emit optional "keepingChoices" on the agent_output envelope. Do not create or stage those meanings this turn. The human may select any, all, or none — each choice is independently selectable once.',
  'A turn may contain both: directed act → actions / propose; additional undirected meanings → keepingChoices.',
  'keepingChoices are not actions and are not executed this turn. Do not invent a kind field. Offer only relevant choices — restraint over filling the capacity of 6.',
  'Never infer this distinction from keyword lists. Infer from whether the human already authorized a specific keep act.',
].join('\n');

/** Walk Kip/System run envelopes the same way card/actions are extracted. */
export function extractKeepingChoicesFromRunResult(result: unknown): KeepingChoiceRecord[] {
  const visit = (node: unknown, depth = 0): KeepingChoiceRecord[] | null => {
    if (!node || typeof node !== 'object' || depth > 5) return null;
    const obj = node as Record<string, unknown>;
    const fromHere = parseKeepingChoiceRecords(obj.keepingChoices);
    if (fromHere.length) return fromHere;
    if (obj.data !== undefined) return visit(obj.data, depth + 1);
    return null;
  };
  return visit(result) ?? [];
}
