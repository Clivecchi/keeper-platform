/**
 * Turn-scoped Frame Performance.
 *
 * Lives on the Lead message. Document, Section, Point, and beat titles stay
 * distinct. Theatre state and markup do not belong here.
 */

export const FRAME_PERFORMANCE_VERSION = 1 as const;
export const FRAME_PERFORMANCE_MAX_BEATS = 4 as const;
export const FRAME_PERFORMANCE_MAX_VOICES = 4 as const;

export const FRAME_CUE_KINDS = ['keep', 'review_cast', 'open_stage', 'open_point'] as const;
export type FrameCueKind = (typeof FRAME_CUE_KINDS)[number];

/** Lines the Lead chose from real Cast replies. Not the full rehearsal. */
export type SelectedVoice = {
  slug: string;
  line: string;
};

export type FramePerformanceContext = {
  /** Document title. Contextual metadata, never the headline. */
  documentTitle?: string;
  /**
   * Authored Section title.
   * Null means the Point is unassigned. Omit when the Document is unknown.
   */
  sectionTitle?: string | null;
};

export type FramePerformanceVoice = {
  slug: string;
  attributedTo: string;
  text: string;
};

export type FramePerformanceBeat = {
  /** Title of this beat. Not the Document title. Not required to equal the Point title. */
  title: string;
  body: string;
  voice?: FramePerformanceVoice;
};

export type FrameCueAction = {
  kind: FrameCueKind;
  label: string;
  pointId?: string;
  draftId?: string;
  dialogId?: string;
};

export type FramePerformanceCue = {
  prompt: string;
  actions: FrameCueAction[];
};

export type FramePerformance = {
  version: typeof FRAME_PERFORMANCE_VERSION;
  context?: FramePerformanceContext;
  /** Point / subject of the telling. */
  title: string;
  beats: FramePerformanceBeat[];
  cue?: FramePerformanceCue;
};

export type ParseFramePerformanceOptions = {
  /**
   * When set, every woven voice must be one of these lines.
   * Client reloads omit this — the row was validated when it was saved.
   */
  selectedVoices?: readonly SelectedVoice[];
};

const HTML_MARKUP = /<\/?[a-z][^>]*>/i;
const CUE_KIND_SET = new Set<string>(FRAME_CUE_KINDS);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function clipped(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return undefined;
  if (HTML_MARKUP.test(trimmed)) return undefined;
  return trimmed;
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sameTitle(left: string, right: string): boolean {
  return compactText(left).toLowerCase() === compactText(right).toLowerCase();
}

export function parseSelectedVoices(raw: unknown): SelectedVoice[] {
  if (!Array.isArray(raw)) return [];
  const voices: SelectedVoice[] = [];
  for (const item of raw) {
    const rec = asRecord(item);
    if (!rec) continue;
    const slug = clipped(rec.slug, 80)?.toLowerCase();
    const line = clipped(rec.line, 500);
    if (!slug || !line) continue;
    if (voices.some((voice) => voice.slug === slug && voice.line === line)) continue;
    voices.push({ slug, line });
    if (voices.length >= FRAME_PERFORMANCE_MAX_VOICES) break;
  }
  return voices;
}

function parseVoice(
  raw: unknown,
  selectedVoices: readonly SelectedVoice[] | undefined,
): FramePerformanceVoice | null | 'reject' {
  if (raw == null) return null;
  const rec = asRecord(raw);
  if (!rec) return 'reject';
  const slug = clipped(rec.slug, 80)?.toLowerCase();
  const attributedTo = clipped(rec.attributedTo, 80);
  const text = clipped(rec.text, 500);
  if (!slug || !attributedTo || !text) return 'reject';
  if (selectedVoices) {
    const source = selectedVoices.find((voice) => voice.slug === slug);
    if (!source) return 'reject';
    const quote = compactText(text);
    const line = compactText(source.line);
    if (!quote || !line.includes(quote)) return 'reject';
  }
  return { slug, attributedTo, text };
}

function parseContext(raw: unknown): FramePerformanceContext | undefined | 'reject' {
  if (raw == null) return undefined;
  const rec = asRecord(raw);
  if (!rec) return 'reject';
  const documentTitle = clipped(rec.documentTitle, 200);
  let sectionTitle: string | null | undefined;
  if (rec.sectionTitle === null) sectionTitle = null;
  else if (rec.sectionTitle == null) sectionTitle = undefined;
  else {
    const section = clipped(rec.sectionTitle, 200);
    if (!section) return 'reject';
    sectionTitle = section;
  }
  if (!documentTitle && sectionTitle === undefined) return undefined;
  return {
    ...(documentTitle ? { documentTitle } : {}),
    ...(sectionTitle !== undefined ? { sectionTitle } : {}),
  };
}

function parseCue(raw: unknown): FramePerformanceCue | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const prompt = clipped(rec.prompt, 180);
  if (!prompt || !Array.isArray(rec.actions)) return undefined;
  const actions: FrameCueAction[] = [];
  for (const item of rec.actions) {
    const action = asRecord(item);
    if (!action) continue;
    const kind = typeof action.kind === 'string' ? action.kind.trim() : '';
    const label = clipped(action.label, 80);
    if (!CUE_KIND_SET.has(kind) || !label) continue;
    const pointId = clipped(action.pointId, 80);
    const draftId = clipped(action.draftId, 80);
    const dialogId = clipped(action.dialogId, 80);
    actions.push({
      kind: kind as FrameCueKind,
      label,
      ...(pointId ? { pointId } : {}),
      ...(draftId ? { draftId } : {}),
      ...(dialogId ? { dialogId } : {}),
    });
    if (actions.length >= 4) break;
  }
  if (!actions.length) return undefined;
  return { prompt, actions };
}

/**
 * Validate a Rendr composition.
 * More than four beats, markup, or an unselected voice rejects the whole performance.
 */
export function parseFramePerformance(
  raw: unknown,
  options?: ParseFramePerformanceOptions,
): FramePerformance | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  if (rec.version != null && rec.version !== FRAME_PERFORMANCE_VERSION) return null;
  const title = clipped(rec.title, 200);
  if (!title || !Array.isArray(rec.beats)) return null;
  if (rec.beats.length > FRAME_PERFORMANCE_MAX_BEATS) return null;

  const context = parseContext(rec.context);
  if (context === 'reject') return null;
  if (context?.documentTitle && sameTitle(title, context.documentTitle)) return null;
  if (context?.sectionTitle && sameTitle(title, context.sectionTitle)) return null;

  const beats: FramePerformanceBeat[] = [];
  for (const item of rec.beats) {
    const beat = asRecord(item);
    if (!beat) return null;
    const beatTitle = clipped(beat.title, 200);
    const body = clipped(beat.body, 4000);
    if (!beatTitle || !body) return null;
    if (context?.documentTitle && sameTitle(beatTitle, context.documentTitle)) return null;
    const voice = parseVoice(beat.voice, options?.selectedVoices);
    if (voice === 'reject') return null;
    beats.push({
      title: beatTitle,
      body,
      ...(voice ? { voice } : {}),
    });
  }
  if (!beats.length) return null;

  const cue = parseCue(rec.cue);
  return {
    version: FRAME_PERFORMANCE_VERSION,
    ...(context ? { context } : {}),
    title,
    beats,
    ...(cue ? { cue } : {}),
  };
}

export function parseFramePerformanceFromModelText(
  raw: string,
  options?: ParseFramePerformanceOptions,
): FramePerformance | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const tryParse = (text: string): FramePerformance | null => {
    try {
      return parseFramePerformance(JSON.parse(text), options);
    } catch {
      return null;
    }
  };
  const direct = tryParse(trimmed);
  if (direct) return direct;
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  if (fenced !== trimmed) {
    const fromFence = tryParse(fenced);
    if (fromFence) return fromFence;
  }
  const match = trimmed.match(/\{[\s\S]*"beats"\s*:[\s\S]*\}/);
  return match ? tryParse(match[0]) : null;
}

/** Keeper replaces Rendr's context with Document / Section it already knows. */
export function withPerformanceContext(
  performance: FramePerformance,
  context: FramePerformanceContext | undefined,
): FramePerformance | null {
  if (!context || (context.documentTitle == null && context.sectionTitle === undefined)) {
    const { context: _ignored, ...rest } = performance;
    return rest;
  }
  return parseFramePerformance({ ...performance, context });
}

export type FrameCueBinding = {
  pointId?: string | null;
  draftId?: string | null;
  dialogId?: string | null;
  hasCastVoices: boolean;
};

/**
 * Drop cue actions Keeper cannot perform.
 * Supply a quiet default when Rendr omitted the cue.
 */
export function bindFramePerformanceCue(
  performance: FramePerformance,
  binding: FrameCueBinding,
): FramePerformance {
  const pointId = binding.pointId?.trim() || undefined;
  const draftId = binding.draftId?.trim() || undefined;
  const dialogId = binding.dialogId?.trim() || undefined;
  const canPoint = Boolean(pointId && draftId);

  const source = performance.cue?.actions ?? [];
  const actions: FrameCueAction[] = [];
  const push = (action: FrameCueAction) => {
    if (actions.some((row) => row.kind === action.kind)) return;
    actions.push(action);
  };

  for (const action of source) {
    if (action.kind === 'review_cast') {
      if (!binding.hasCastVoices) continue;
      push({ kind: 'review_cast', label: action.label });
      continue;
    }
    if (action.kind === 'open_stage') {
      push({ kind: 'open_stage', label: action.label });
      continue;
    }
    if ((action.kind === 'keep' || action.kind === 'open_point') && canPoint) {
      push({
        kind: action.kind,
        label: action.label,
        pointId,
        draftId,
        ...(dialogId ? { dialogId } : {}),
      });
    }
  }

  if (binding.hasCastVoices && !actions.some((action) => action.kind === 'review_cast')) {
    push({ kind: 'review_cast', label: 'Review the Cast' });
  }
  if (!actions.some((action) => action.kind === 'open_stage')) {
    push({ kind: 'open_stage', label: 'Take to Stage' });
  }
  if (canPoint && !actions.some((action) => action.kind === 'open_point')) {
    push({
      kind: 'open_point',
      label: 'Open the Point',
      pointId,
      draftId,
      ...(dialogId ? { dialogId } : {}),
    });
  }

  return {
    ...performance,
    cue: {
      prompt: performance.cue?.prompt?.trim() || 'Ready to move this forward?',
      actions,
    },
  };
}

export function turnPresentsFrame(
  message: { framePerformance?: FramePerformance | null } | null | undefined,
): boolean {
  return Boolean(message?.framePerformance && message.framePerformance.beats.length > 0 && message.framePerformance.title);
}
