/**
 * Keeper Stage — composition/presence over existing Keeper objects.
 *
 * Stage owns placement and contextual Agency, not duplicate object truth.
 * A Document on Stage remains the Document. Kip on Stage remains Kip.
 *
 * Theatre.js Present sheets stay Chronicle motion. This contract is Keeper
 * semantics; visual choreography may consume it later.
 */

export const KEEPER_STAGE_SLUG = 'keeper' as const;
export const KEEPER_STAGE_TITLE = 'Keeper';
export const KEEPER_STAGE_SETTINGS_KEY = 'keeperStage';
export const KEEPER_STAGE_VERSION = 1 as const;

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

export type KeeperStageComposition = {
  version: typeof KEEPER_STAGE_VERSION;
  slug: typeof KEEPER_STAGE_SLUG;
  title: string;
  selectedPresenceId: string | null;
  presences: StagePresence[];
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
  };
}

export function isStagePresenceKind(value: unknown): value is StagePresenceKind {
  return typeof value === 'string' && KIND_SET.has(value);
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

/**
 * Compact Stage summary for agent turns — composition, not Theatre layout.
 */
export function buildKeeperStagePrompt(stage: KeeperStageComposition | null | undefined): string | null {
  if (!stage || stage.presences.length === 0) return null;
  const selected = stage.presences.find((p) => p.id === stage.selectedPresenceId) ?? null;
  const lines = [
    'KEEPER STAGE (spatial composition — references, not clones):',
    `Stage: “${stage.title}” (${stage.slug}). Objects below are the real Keeper objects present here.`,
  ];
  for (const presence of stage.presences) {
    const selectedMark = selected?.id === presence.id ? ' [selected]' : '';
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
  lines.push(
    'Selecting an object on Stage may set Working on without changing Talking in.',
    'Contextual stage role/direction is who the Agent is here — it does not redefine Base Agency.',
    'Do not invent objects that are not on this Stage or in Talking in / Working on.',
  );
  return lines.join('\n');
}
