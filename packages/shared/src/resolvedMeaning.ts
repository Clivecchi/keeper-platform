/**
 * Resolved Meaning — structured result of a Lead-directed performance.
 *
 * Sibling on agent_output (same family as card / keepingChoices).
 * Not spoken prose. Not Cast transcript. Not a keep offer. Not a mutation.
 * Rendr composes expression from this — it must not reinterpret the night.
 */

export const RESOLVED_MEANING_MEANING_MAX_CHARS = 500 as const;
export const RESOLVED_MEANING_BECAUSE_MAX_CHARS = 400 as const;
export const RESOLVED_MEANING_TITLE_MAX_CHARS = 120 as const;
export const RESOLVED_MEANING_ABOUT_MAX = 8 as const;
export const RESOLVED_MEANING_PERFORMED_BY_MAX = 8 as const;

export const RESOLVED_MEANING_REF_KINDS = [
  'dialog',
  'point',
  'draft',
  'keeper',
  'journey',
  'moment',
  'library',
  'presence',
] as const;

export type ResolvedMeaningRefKind = (typeof RESOLVED_MEANING_REF_KINDS)[number];

export type ResolvedMeaningRef = {
  kind: ResolvedMeaningRefKind;
  id: string;
  title?: string;
};

/** Lead-emitted. Nothing here is executed. No semantic taxonomy. */
export type ResolvedMeaning = {
  meaning: string;
  because?: string;
  about: ResolvedMeaningRef[];
  performedBy: string[];
};

/** Persisted on the Lead message after Keeper appends one Stage beat. */
export type StageExpressionStamp = {
  slideId: string;
  title: string;
  at: string;
  rationale?: string;
};

export const STAGE_EXPRESSION_TYPE = 'stage_expression' as const;

export type StageExpressionBeat = {
  title: string;
  body: string;
};

/** Rendr output — one performance → one Frame (one text_slide). */
export type StageExpression = {
  type: typeof STAGE_EXPRESSION_TYPE;
  beat: StageExpressionBeat;
  rationale?: string;
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

const REF_KIND_SET = new Set<string>(RESOLVED_MEANING_REF_KINDS);

function parseRef(raw: unknown): ResolvedMeaningRef | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const kind = typeof rec.kind === 'string' ? rec.kind.trim() : '';
  const id = clipped(rec.id, 80);
  if (!REF_KIND_SET.has(kind) || !id) return null;
  const title = clipped(rec.title, RESOLVED_MEANING_TITLE_MAX_CHARS);
  return {
    kind: kind as ResolvedMeaningRefKind,
    id,
    ...(title ? { title } : {}),
  };
}

function parsePerformedBy(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const slugs: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const slug = item.trim().toLowerCase();
    if (!slug || slugs.includes(slug)) continue;
    slugs.push(slug);
    if (slugs.length >= RESOLVED_MEANING_PERFORMED_BY_MAX) break;
  }
  return slugs;
}

export function parseResolvedMeaning(raw: unknown): ResolvedMeaning | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const meaning = clipped(rec.meaning, RESOLVED_MEANING_MEANING_MAX_CHARS);
  if (!meaning) return null;
  const because = clipped(rec.because, RESOLVED_MEANING_BECAUSE_MAX_CHARS);
  const about: ResolvedMeaningRef[] = [];
  if (Array.isArray(rec.about)) {
    for (const item of rec.about) {
      const ref = parseRef(item);
      if (!ref) continue;
      about.push(ref);
      if (about.length >= RESOLVED_MEANING_ABOUT_MAX) break;
    }
  }
  return {
    meaning,
    ...(because ? { because } : {}),
    about,
    performedBy: parsePerformedBy(rec.performedBy),
  };
}

/** Keeper may stamp who actually delivered when Lead omitted slugs. */
export function withPerformedByFallback(
  resolved: ResolvedMeaning,
  deliveredSlugs: readonly string[],
): ResolvedMeaning {
  if (resolved.performedBy.length) return resolved;
  return { ...resolved, performedBy: parsePerformedBy([...deliveredSlugs]) };
}

function parseBeat(raw: unknown): StageExpressionBeat | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const title = clipped(rec.title, 200);
  const body = clipped(rec.body, 4000) ?? '';
  if (!title) return null;
  return { title, body };
}

/**
 * One beat only. Extra beats are ignored.
 * Accepts `{ beat }` or legacy `{ beats: [first] }`.
 */
export function parseStageExpression(raw: unknown): StageExpression | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const fromBeat = parseBeat(rec.beat);
  const fromList = Array.isArray(rec.beats) ? parseBeat(rec.beats[0]) : null;
  const beat = fromBeat ?? fromList;
  if (!beat) return null;
  const rationale = clipped(rec.rationale, 400);
  return {
    type: STAGE_EXPRESSION_TYPE,
    beat,
    ...(rationale ? { rationale } : {}),
  };
}

export function parseStageExpressionFromModelText(raw: string): StageExpression | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const tryParse = (text: string): StageExpression | null => {
    try {
      return parseStageExpression(JSON.parse(text));
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
  const match = trimmed.match(/\{[\s\S]*"type"\s*:\s*"stage_expression"[\s\S]*\}/);
  return match ? tryParse(match[0]) : null;
}

export function parseStageExpressionStamp(raw: unknown): StageExpressionStamp | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const slideId = clipped(rec.slideId, 80);
  const title = clipped(rec.title, 200);
  const at = clipped(rec.at, 40);
  if (!slideId || !title || !at) return null;
  const rationale = clipped(rec.rationale, 400);
  return {
    slideId,
    title,
    at,
    ...(rationale ? { rationale } : {}),
  };
}
