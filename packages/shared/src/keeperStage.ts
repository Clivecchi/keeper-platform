/**
 * Keeper Stage — composition/presence over existing Keeper objects.
 *
 * Stage owns placement and contextual Agency, not duplicate object truth.
 * Objects on Stage are assets. There is one story on this Stage; agents lay it out.
 * A Document on Stage remains the Document. Kip on Stage remains Kip.
 * Chronicle Points stay discussion. Kept lifts hierarchy weight off the Document.
 *
 * Theatre.js Present sheets stay Chronicle motion. This contract is Keeper
 * semantics; visual choreography may consume it later.
 */

export const KEEPER_STAGE_SLUG = 'keeper' as const;
export const KEEPER_STAGE_TITLE = 'Keeper';
export const KEEPER_STAGE_SETTINGS_KEY = 'keeperStage';
export const KEEPER_STAGE_VERSION = 1 as const;
export const STAGE_STORY_VERSION = 1 as const;
export const STAGE_SLIDE_TYPE_COVER = 'domain_cover' as const;
export const STAGE_SLIDE_TYPE_TEXT = 'text_slide' as const;
export const STAGE_STORY_MAX_SLIDES = 24 as const;

export const STAGE_STORY_SOURCE_KINDS = [
  'live',
  'point',
  'moment',
  'path',
  'keeper',
  'journey',
] as const;

export const STAGE_PRESENCE_KINDS = [
  'agent',
  'dialog',
  'draft',
  'journey',
  'keeper',
  'moment',
  'library',
] as const;

export type StagePresenceKind = (typeof STAGE_PRESENCE_KINDS)[number];

export type StagePresence = {
  /** Presence id — Stage-owned. Not the Keeper object id. */
  id: string;
  kind: StagePresenceKind;
  objectId: string;
  title: string;
  /** Normalized canvas position 0–1. */
  x: number;
  y: number;
  /** Contextual Agency — who this Agent is here. Ignored for non-agents. */
  contextualRole?: string | null;
  direction?: string | null;
};

export type StageSlideType = typeof STAGE_SLIDE_TYPE_COVER | typeof STAGE_SLIDE_TYPE_TEXT;

/** Root is the domain Cover. Beats are the selected story after Forward. */
export type StageSlideKind = 'root' | 'beat';

export type StageStorySourceKind = (typeof STAGE_STORY_SOURCE_KINDS)[number];

export type StageStorySlideSource = {
  kind: StageStorySourceKind;
  id?: string | null;
};

export type StageStorySlide = {
  id: string;
  slideType: StageSlideType;
  kind: StageSlideKind;
  title: string;
  body: string;
  source?: StageStorySlideSource;
};

/** One story on this Stage. Not a Prisma table. Not the Document. */
export type StageStory = {
  version: typeof STAGE_STORY_VERSION;
  slides: StageStorySlide[];
};

/**
 * Stage look. Null / inherit = domain Treatment + cover.
 * Own look grows from uploaded imagery (same palette pipeline as the domain).
 * Not a Prisma Theme table.
 */
export type KeeperStageThemePalette = {
  background: string;
  accent: string;
  primary: string;
  surface: string;
  dark: boolean;
};

export type KeeperStageTheme = {
  inherit: boolean;
  sourceImage?: string | null;
  palette?: KeeperStageThemePalette | null;
};

export type KeeperStageComposition = {
  version: typeof KEEPER_STAGE_VERSION;
  slug: typeof KEEPER_STAGE_SLUG;
  title: string;
  selectedPresenceId: string | null;
  presences: StagePresence[];
  /** Laid-out filmstrip. Null until agents (or a human) write it. */
  story: StageStory | null;
  /** Null or inherit:true uses the domain. */
  theme: KeeperStageTheme | null;
};

export type WorkspaceSurface = 'dialog' | 'stage';

const KIND_SET = new Set<string>(STAGE_PRESENCE_KINDS);

function trimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  return next ? next : null;
}

function clampUnit(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function emptyKeeperStage(): KeeperStageComposition {
  return {
    version: KEEPER_STAGE_VERSION,
    slug: KEEPER_STAGE_SLUG,
    title: KEEPER_STAGE_TITLE,
    selectedPresenceId: null,
    presences: [],
    story: null,
    theme: null,
  };
}

export function isStagePresenceKind(value: unknown): value is StagePresenceKind {
  return typeof value === 'string' && KIND_SET.has(value);
}

const SOURCE_KIND_SET = new Set<string>(STAGE_STORY_SOURCE_KINDS);

export function isStageStorySourceKind(value: unknown): value is StageStorySourceKind {
  return typeof value === 'string' && SOURCE_KIND_SET.has(value);
}

function parseSlideSource(raw: unknown): StageStorySlideSource | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const rec = raw as Record<string, unknown>;
  if (!isStageStorySourceKind(rec.kind)) return undefined;
  return { kind: rec.kind, id: trimmed(rec.id) };
}

function slideId(raw: unknown, index: number, kind: StageSlideKind): string {
  return trimmed(raw) ?? (kind === 'root' ? 'root' : `slide-${index + 1}`);
}

export function parseStageStory(raw: unknown): StageStory | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const rows = Array.isArray(rec.slides) ? rec.slides : [];
  const slides: StageStorySlide[] = [];
  const seen = new Set<string>();

  for (const item of rows) {
    if (slides.length >= STAGE_STORY_MAX_SLIDES) break;
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const title = trimmed(row.title);
    if (!title) continue;
    const wantsRoot = row.kind === 'root' || row.slideType === STAGE_SLIDE_TYPE_COVER;
    if (wantsRoot) continue;
    const kind: StageSlideKind = 'beat';
    const id = slideId(row.id, slides.length, kind);
    if (seen.has(id) || id === 'root') continue;
    seen.add(id);
    const source = parseSlideSource(row.source);
    const body = typeof row.body === 'string' ? row.body.trim() : '';
    slides.push({
      id,
      slideType: STAGE_SLIDE_TYPE_TEXT,
      kind,
      title: title.slice(0, 200),
      body: body.slice(0, 4000),
      ...(source ? { source } : {}),
    });
  }

  if (slides.length === 0) return null;
  return { version: STAGE_STORY_VERSION, slides };
}

export function domainCoverRootSlide(input: {
  wordmark?: string | null;
  tagline?: string | null;
  domainLabel?: string | null;
}): StageStorySlide {
  const title = trimmed(input.wordmark) ?? trimmed(input.domainLabel) ?? 'Domain';
  const body = trimmed(input.tagline) ?? '';
  return {
    id: 'root',
    slideType: STAGE_SLIDE_TYPE_COVER,
    kind: 'root',
    title,
    body,
  };
}

/** Platform owns the domain Root. Agent/persisted slides are the story after Forward. */
export function withDomainCoverRoot(
  slides: ReadonlyArray<StageStorySlide>,
  root: StageStorySlide,
): StageStorySlide[] {
  const story = slides.filter((slide) => slide.kind !== 'root' && slide.slideType !== STAGE_SLIDE_TYPE_COVER);
  return [root, ...story];
}

function parseHexColor(raw: unknown): string | null {
  const value = trimmed(raw);
  if (!value) return null;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : null;
}

function parseStageThemePalette(raw: unknown): KeeperStageThemePalette | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const background = parseHexColor(rec.background);
  const accent = parseHexColor(rec.accent);
  const primary = parseHexColor(rec.primary);
  const surface = parseHexColor(rec.surface);
  if (!background || !accent || !primary || !surface) return null;
  return {
    background,
    accent,
    primary,
    surface,
    dark: rec.dark === true,
  };
}

export function parseKeeperStageTheme(raw: unknown): KeeperStageTheme | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  if (rec.inherit !== false) {
    return { inherit: true };
  }
  return {
    inherit: false,
    sourceImage: trimmed(rec.sourceImage),
    palette: parseStageThemePalette(rec.palette),
  };
}

export function stageThemeInheritsDomain(theme: KeeperStageTheme | null | undefined): boolean {
  return theme == null || theme.inherit !== false;
}

/** PATCH without `story` (or `story: null`) keeps the current filmstrip. `story: { slides: [] }` clears it. */
export function mergeKeeperStagePatch(
  current: KeeperStageComposition,
  patch: unknown,
): KeeperStageComposition {
  const rec = patch && typeof patch === 'object' && !Array.isArray(patch)
    ? (patch as Record<string, unknown>)
    : {};
  const storyPatch = !('story' in rec) || rec.story == null ? current.story : rec.story;
  const themePatch = !('theme' in rec) || rec.theme == null ? current.theme : rec.theme;
  return parseKeeperStage({
    title: 'title' in rec ? rec.title : current.title,
    selectedPresenceId: 'selectedPresenceId' in rec ? rec.selectedPresenceId : current.selectedPresenceId,
    presences: 'presences' in rec ? rec.presences : current.presences,
    story: storyPatch,
    theme: themePatch,
  });
}

export function parseKeeperStage(raw: unknown): KeeperStageComposition {
  const empty = emptyKeeperStage();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty;
  const rec = raw as Record<string, unknown>;
  const presencesIn = Array.isArray(rec.presences) ? rec.presences : [];
  const presences: StagePresence[] = [];
  const seen = new Set<string>();

  for (const item of presencesIn) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const kind = row.kind;
    const objectId = trimmed(row.objectId);
    const id = trimmed(row.id);
    if (!isStagePresenceKind(kind) || !objectId || !id) continue;
    const key = `${kind}:${objectId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    presences.push({
      id,
      kind,
      objectId,
      title: trimmed(row.title) ?? kind,
      x: clampUnit(row.x, nextSlot(presences).x),
      y: clampUnit(row.y, nextSlot(presences).y),
      contextualRole: trimmed(row.contextualRole),
      direction: trimmed(row.direction),
    });
  }

  const selected = trimmed(rec.selectedPresenceId);
  return {
    version: KEEPER_STAGE_VERSION,
    slug: KEEPER_STAGE_SLUG,
    title: trimmed(rec.title) ?? KEEPER_STAGE_TITLE,
    selectedPresenceId: selected && presences.some((p) => p.id === selected) ? selected : null,
    presences,
    story: parseStageStory(rec.story),
    theme: parseKeeperStageTheme(rec.theme),
  };
}

export function readKeeperStageFromDomainSettings(settings: unknown): KeeperStageComposition {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return emptyKeeperStage();
  }
  return parseKeeperStage((settings as Record<string, unknown>)[KEEPER_STAGE_SETTINGS_KEY]);
}

export function nextSlot(presences: ReadonlyArray<Pick<StagePresence, 'x' | 'y'>>): {
  x: number;
  y: number;
} {
  const index = presences.length;
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 0.12 + col * 0.3,
    y: 0.16 + row * 0.28,
  };
}

export function findStagePresence(
  stage: KeeperStageComposition,
  kind: StagePresenceKind,
  objectId: string,
): StagePresence | undefined {
  return stage.presences.find((p) => p.kind === kind && p.objectId === objectId);
}

export function bringOntoStage(
  stage: KeeperStageComposition,
  input: {
    id: string;
    kind: StagePresenceKind;
    objectId: string;
    title: string;
    contextualRole?: string | null;
    direction?: string | null;
  },
): KeeperStageComposition {
  const existing = findStagePresence(stage, input.kind, input.objectId);
  if (existing) {
    return { ...stage, selectedPresenceId: existing.id };
  }
  const slot = nextSlot(stage.presences);
  const presence: StagePresence = {
    id: input.id,
    kind: input.kind,
    objectId: input.objectId,
    title: input.title.trim() || input.kind,
    x: slot.x,
    y: slot.y,
    contextualRole: trimmed(input.contextualRole),
    direction: trimmed(input.direction),
  };
  return {
    ...stage,
    selectedPresenceId: presence.id,
    presences: [...stage.presences, presence],
  };
}

export function updateStagePresence(
  stage: KeeperStageComposition,
  presenceId: string,
  patch: Partial<Pick<StagePresence, 'x' | 'y' | 'title' | 'contextualRole' | 'direction'>>,
): KeeperStageComposition {
  return {
    ...stage,
    presences: stage.presences.map((p) => {
      if (p.id !== presenceId) return p;
      return {
        ...p,
        ...('title' in patch && patch.title != null ? { title: patch.title } : {}),
        ...('x' in patch ? { x: clampUnit(patch.x, p.x) } : {}),
        ...('y' in patch ? { y: clampUnit(patch.y, p.y) } : {}),
        ...('contextualRole' in patch ? { contextualRole: trimmed(patch.contextualRole) } : {}),
        ...('direction' in patch ? { direction: trimmed(patch.direction) } : {}),
      };
    }),
  };
}

export function removeStagePresence(
  stage: KeeperStageComposition,
  presenceId: string,
): KeeperStageComposition {
  const presences = stage.presences.filter((p) => p.id !== presenceId);
  return {
    ...stage,
    selectedPresenceId: stage.selectedPresenceId === presenceId ? null : stage.selectedPresenceId,
    presences,
  };
}

export function selectStagePresence(
  stage: KeeperStageComposition,
  presenceId: string | null,
): KeeperStageComposition {
  if (!presenceId) return { ...stage, selectedPresenceId: null };
  if (!stage.presences.some((p) => p.id === presenceId)) return stage;
  return { ...stage, selectedPresenceId: presenceId };
}

export function stagePresenceKindLabel(kind: StagePresenceKind): string {
  switch (kind) {
    case 'agent':
      return 'Agent';
    case 'dialog':
      return 'Dialog';
    case 'draft':
      return 'Draft';
    case 'journey':
      return 'Journey';
    case 'keeper':
      return 'Keeper';
    case 'moment':
      return 'Moment';
    case 'library':
      return 'Library';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function isPlatformDefaultStageTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return !normalized || normalized === 'keeper' || normalized === 'keeper stage';
}

/** Default Stage belongs to the current domain. Platform fallback is Keeper Stage. */
export function displayKeeperStageTitle(title: string, domainLabel?: string | null): string {
  const trimmed = title.trim();
  if (!isPlatformDefaultStageTitle(trimmed)) return trimmed;
  const label = domainLabel?.trim();
  if (!label) return 'Keeper Stage';
  return /\bstage\b/i.test(label) ? label : `${label} Stage`;
}

/**
 * Compact Stage summary for agent turns — one story to lay out, not Theatre layout.
 */
export function buildKeeperStagePrompt(
  stage: KeeperStageComposition | null | undefined,
  domainLabel?: string | null,
  options?: { onStage?: boolean },
): string | null {
  const hasStory = Boolean(stage?.story?.slides.length);
  const hasAssets = Boolean(stage?.presences.length);
  if (!stage || (!hasAssets && !hasStory && options?.onStage !== true)) return null;
  const selected = stage.presences.find((p) => p.id === stage.selectedPresenceId) ?? null;
  const lines = [
    'KEEPER STAGE (one story on this screen — assets are references, not clones):',
    `Stage: “${displayKeeperStageTitle(stage.title, domainLabel)}” (${stage.slug}). Objects below are real Keeper objects on this table.`,
    'There is a single story being told here. Lay it out as Slides from what is here and what has been said. Do not treat the sequence as an open question.',
    'Assets (Documents, Drafts, Journeys, Moments, Library, Cast) are material for that story — not the story.',
    'Wide context is everything placed. Narrow context is the selected object plus what you have just been told.',
    'The Stage story is Slides for presentation, not new Points for discussion. Chronicle Document stays the Document. Do not dump discussion Points onto Stage.',
  ];
  for (const presence of stage.presences) {
    const selectedMark = selected?.id === presence.id ? ' [selected — narrow]' : '';
    const agency =
      presence.kind === 'agent'
        ? [
            presence.contextualRole ? `stage role: ${presence.contextualRole}` : null,
            presence.direction ? `direction: ${presence.direction}` : null,
          ]
            .filter(Boolean)
            .join('; ')
        : '';
    lines.push(
      `- ${stagePresenceKindLabel(presence.kind)} “${presence.title}” (${presence.kind}:${presence.objectId})${selectedMark}${agency ? ` — ${agency}` : ''}`,
    );
  }
  if (hasStory && stage.story) {
    lines.push('Current filmstrip (replace the whole sequence when you lay it out again):');
    for (const [index, slide] of stage.story.slides.entries()) {
      const source = slide.source
        ? ` [${slide.source.kind}${slide.source.id ? `:${slide.source.id}` : ''}]`
        : '';
      lines.push(`  ${index + 1}. ${slide.kind} “${slide.title}”${source}`);
    }
  } else {
    lines.push('The selected story is not laid out yet. Keeper already places the domain Root (Cover). Your slides are what Forward opens.');
  }
  lines.push(
    'Selecting an object on Stage may set Working on without changing Talking in.',
    'Contextual stage role/direction is who the Agent is here — it does not redefine Base Agency.',
    'Do not invent objects that are not on this Stage or in Talking in / Working on.',
    'Emit stage.story.layout this turn with payload.slides in order. Those slides are the selected story after Forward — text_slide beats. Do not emit the domain Cover / Root; Keeper places that from the domain frame. Optional source: { kind: live|point|moment|path|keeper|journey, id }. Review & Reorganize remains for the Document only.',
  );
  return lines.join('\n');
}
