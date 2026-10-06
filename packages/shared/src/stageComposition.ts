/**
 * Ephemeral Stage pass.
 *
 * Context + Truth → Reading → Composition → Stage.
 * KeeperStageComposition stays the stored story, presences, and theme.
 * This module does not write that record.
 *
 * The projector may arrange only ids the Reading already contains.
 * A node that cites a missing id is dropped.
 */

import type { DomainAudienceRole } from './domains/resolveDomainAudience.js';
import type { StageStorySlideSource } from './keeperStage.js';
import type { RealmWhereWeAreReading } from './realmArrival.js';
import type {
  WhereWeAreClaim,
  WhereWeAreClaimKind,
  WhereWeAreProvenance,
  WhereWeAreReading,
} from './stageArrival.js';

export type StageTruthKey = 'realm-where-we-are' | 'domain-where-we-are' | 'story';

export type StageContext = {
  scope: 'realm' | 'domain';
  /** Set for a Domain pass. Absent for Realm. */
  domainId?: string;
  audience: DomainAudienceRole;
  /** Selector only. Does not choose a renderer. */
  arriving: boolean;
};

export type StageSourceRef =
  | { kind: 'domain'; id: string }
  | { kind: 'dialog'; id: string }
  | { kind: 'claim'; claimKind: WhereWeAreClaimKind; dialogId: string; domainId?: string }
  | { kind: 'uncertainty'; id: string }
  | { kind: 'domain-cover'; domainId: string }
  | { kind: 'stage-slide'; id: string; storySource?: StageStorySlideSource }
  | { kind: 'frame'; messageId: string }
  | { kind: 'feed-event'; id: string }
  | { kind: 'trail'; id: string };

export type StageContinueAction = {
  kind: 'continue';
  subject: StageSourceRef;
  /**
   * Present when the next pass is known.
   * Realm → Domain sets this.
   * Domain → Dialog omits it. Room policy for that subject is undecided.
   */
  nextContext?: StageContext;
};

export type StageReadingItem = {
  id: string;
  lifecycle: 'derived' | 'stored' | 'live';
  /** Fixed from resolver output. Rendr does not rewrite it. */
  text: string;
  source: StageSourceRef;
  provenance?: WhereWeAreProvenance;
  actions: StageContinueAction[];
};

export type StageReading = {
  context: StageContext;
  items: StageReadingItem[];
};

export type StageEmphasis = 'primary' | 'support' | 'trail';

/** Existing Theatre sheets only. Omitted when this cite has no sheet yet. */
export type StagePresent = 'cover' | 'slide' | 'frame';

export const STAGE_GROUP_LAYOUTS = ['stack', 'row', 'split', 'hero'] as const;
export type StageGroupLayout = (typeof STAGE_GROUP_LAYOUTS)[number];

/** A cite that can continue. `place` navigates. `text` stays a line. */
export const STAGE_CITE_GESTURES = ['place', 'text'] as const;
export type StageCiteGesture = (typeof STAGE_CITE_GESTURES)[number];

export const STAGE_DRESS_TITLES = ['display', 'quiet', 'none'] as const;
export const STAGE_DRESS_FIELDS = ['paper', 'stage', 'clear'] as const;
export const STAGE_DRESS_DENSITIES = ['open', 'close'] as const;
export const STAGE_DRESS_MOTIONS = ['still', 'arrive'] as const;
export const STAGE_DRESS_SPANS = ['center', 'room'] as const;

export type StageDressTitle = (typeof STAGE_DRESS_TITLES)[number];
export type StageDressField = (typeof STAGE_DRESS_FIELDS)[number];
export type StageDressDensity = (typeof STAGE_DRESS_DENSITIES)[number];
export type StageDressMotion = (typeof STAGE_DRESS_MOTIONS)[number];
export type StageDressSpan = (typeof STAGE_DRESS_SPANS)[number];

/** Tokens only. Rendr does not emit CSS. */
export type StageCompositionDress = {
  title?: StageDressTitle;
  field?: StageDressField;
  density?: StageDressDensity;
  motion?: StageDressMotion;
  span?: StageDressSpan;
};

export const STAGE_POSTURES = ['presentation', 'workshop'] as const;
export type StagePosture = (typeof STAGE_POSTURES)[number];

export const STAGE_TRUTH_TITLE: Record<StageTruthKey, string> = {
  'realm-where-we-are': 'Where are we?',
  'domain-where-we-are': 'Where are we?',
  story: 'Story',
};

export type StageNode =
  | {
      kind: 'group';
      emphasis: StageEmphasis;
      layout: StageGroupLayout;
      children: StageNode[];
    }
  | {
      kind: 'sequence';
      index: number;
      children: StageNode[];
    }
  | {
      kind: 'cite';
      readingId: string;
      emphasis: StageEmphasis;
      present?: StagePresent;
      gesture?: StageCiteGesture;
    }
  | {
      kind: 'media';
      readingId: string;
    };

export type StageComposition = {
  /** Identity of this pass. A stored arrangement keeps its id. A deterministic pass does not. */
  id: string;
  context: StageContext;
  treatment: 'domain' | 'stage-inherit';
  nodes: StageNode[];
  dress?: StageCompositionDress;
};

export type StoryPassSlide = {
  id: string;
  title: string;
  body: string;
  kind: 'root' | 'beat';
  source?: StageStorySlideSource;
  /** Set when this beat is a promoted Frame on a Lead message. */
  frameMessageId?: string | null;
};

export function selectStageTruth(input: StageContext): StageTruthKey {
  if (input.arriving && input.audience === 'admin' && input.scope === 'realm') {
    return 'realm-where-we-are';
  }
  if (input.arriving && input.audience === 'admin' && input.scope === 'domain') {
    return 'domain-where-we-are';
  }
  return 'story';
}

/** How a stored claim is said. The resolver does not own this wording. */
export function whereWeAreClaimLine(claim: WhereWeAreClaim): string {
  const title = claim.title.trim() || 'This Dialog';
  switch (claim.kind) {
    case 'kept-orientation':
      return `${title} has the kept Orientation.`;
    case 'cleared-orientation-with-forward':
      return `${title} had its Orientation cleared and retains an authored Forward.`;
    case 'recent-kept-dialog':
      return `${title} is the most recently kept named Dialog.`;
    default: {
      const _exhaustive: never = claim.kind;
      return _exhaustive;
    }
  }
}

/** Absent when the claims already name a single place. */
export function whereWeAreUncertainty(reading: WhereWeAreReading): string | null {
  if (reading.places.length === 1) return null;
  return 'The trail does not currently resolve to one place.';
}

/**
 * A Domain's existing sentences, grouped as one Realm continuation.
 * Realm does not add a sentence of its own about resolving to one Domain.
 */
export function realmWhereWeAreLines(reading: WhereWeAreReading): string[] {
  const uncertainty = whereWeAreUncertainty(reading);
  const claims = reading.places.flatMap((place) =>
    reading.claims
      .filter((claim) => claim.dialogId === place.dialogId)
      .map(whereWeAreClaimLine),
  );
  return uncertainty ? [uncertainty, ...claims] : claims;
}

function formatWhen(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function cite(readingId: string, emphasis: StageEmphasis, present?: StagePresent): StageNode {
  return present
    ? { kind: 'cite', readingId, emphasis, present }
    : { kind: 'cite', readingId, emphasis };
}

function stack(emphasis: StageEmphasis, children: StageNode[]): StageNode {
  return { kind: 'group', emphasis, layout: 'stack', children };
}

export function defaultStageDress(truth: StageTruthKey): StageCompositionDress {
  if (truth === 'story') {
    return { title: 'none', field: 'stage', density: 'open', motion: 'still', span: 'center' };
  }
  return { title: 'display', field: 'clear', density: 'close', motion: 'still', span: 'center' };
}

export function deterministicPassId(truth: StageTruthKey): string {
  if (truth === 'realm-where-we-are') return 'pass-realm';
  if (truth === 'domain-where-we-are') return 'pass-domain';
  return 'pass-story';
}

/** Presentation honors span. Workshop keeps the wings. */
export function stagePostureClaimsRoom(
  posture: StagePosture,
  span: StageDressSpan | undefined,
): boolean {
  return posture === 'presentation' && span === 'room';
}

export function dropUnsourcedNodes(
  composition: StageComposition,
  reading: StageReading,
): StageComposition {
  const ids = new Set(reading.items.map((item) => item.id));
  const walk = (node: StageNode): StageNode | null => {
    if (node.kind === 'cite' || node.kind === 'media') {
      return ids.has(node.readingId) ? node : null;
    }
    const children = node.children.map(walk).filter((child): child is StageNode => child != null);
    if (children.length === 0) return null;
    return { ...node, children };
  };
  return {
    ...composition,
    nodes: composition.nodes.map(walk).filter((node): node is StageNode => node != null),
  };
}

function itemMap(reading: StageReading): Map<string, StageReadingItem> {
  return new Map(reading.items.map((item) => [item.id, item]));
}

function composeWhereWeAre(reading: StageReading, id: string): StageComposition {
  const items = itemMap(reading);
  const sceneNotes = reading.items.filter(
    (item) =>
      item.source.kind === 'uncertainty' &&
      (item.source.id === 'scene' || item.source.id === 'empty'),
  );
  const places = reading.items.filter((item) => item.actions.length > 0);
  const trail = reading.items.filter(
    (item) => item.source.kind === 'trail' || item.source.kind === 'feed-event',
  );

  const primaryChildren: StageNode[] = sceneNotes.map((item) => cite(item.id, 'primary'));

  for (const place of places) {
    const placeId = place.source.kind === 'domain' || place.source.kind === 'dialog' ? place.source.id : '';
    const supports = reading.items.filter((item) => {
      if (item.source.kind === 'claim') {
        if (place.source.kind === 'domain') return item.source.domainId === place.source.id;
        if (place.source.kind === 'dialog') {
          return item.source.dialogId === place.source.id && !item.source.domainId;
        }
        return false;
      }
      if (item.source.kind === 'uncertainty') return item.source.id === placeId;
      return false;
    });
    primaryChildren.push(
      stack('primary', [
        cite(place.id, 'primary'),
        ...supports.map((item) => cite(item.id, 'support')),
      ]),
    );
  }

  const nodes: StageNode[] = [];
  if (primaryChildren.length > 0) nodes.push(stack('primary', primaryChildren));
  if (trail.length > 0) nodes.push(stack('trail', trail.map((item) => cite(item.id, 'trail'))));

  return dropUnsourcedNodes(
    {
      id,
      context: reading.context,
      treatment: 'domain',
      dress: defaultStageDress(id === 'pass-realm' ? 'realm-where-we-are' : 'domain-where-we-are'),
      nodes,
    },
    reading,
  );
}

function presentForSlide(item: StageReadingItem): StagePresent {
  if (item.source.kind === 'frame') return 'frame';
  if (item.source.kind === 'domain-cover') return 'cover';
  return 'slide';
}

function composeStory(reading: StageReading, openingIndex: number): StageComposition {
  const plate = reading.items.find((item) => item.id === 'cover-plate');
  const slides = reading.items.filter((item) => item.id !== 'cover-plate');
  const nodes: StageNode[] = [];
  if (plate) nodes.push({ kind: 'media', readingId: plate.id });
  if (slides.length > 0) {
    const index = Math.min(Math.max(0, openingIndex), slides.length - 1);
    nodes.push({
      kind: 'sequence',
      index,
      children: slides.map((item) => cite(item.id, 'primary', presentForSlide(item))),
    });
  }
  return dropUnsourcedNodes(
    {
      id: 'pass-story',
      context: reading.context,
      treatment: 'stage-inherit',
      dress: defaultStageDress('story'),
      nodes,
    },
    reading,
  );
}

/** Deterministic Rendr. Arranges the Reading. Does not add items. */
export function composeStagePass(
  reading: StageReading,
  truth: StageTruthKey,
  openingIndex = 0,
): StageComposition {
  if (truth === 'story') return composeStory(reading, openingIndex);
  return composeWhereWeAre(
    reading,
    truth === 'realm-where-we-are' ? 'pass-realm' : 'pass-domain',
  );
}

function claimItem(
  claim: WhereWeAreClaim,
  domainId: string | undefined,
): StageReadingItem {
  return {
    id: `claim:${domainId ?? 'domain'}:${claim.dialogId}:${claim.kind}`,
    lifecycle: 'derived',
    text: whereWeAreClaimLine(claim),
    source: {
      kind: 'claim',
      claimKind: claim.kind,
      dialogId: claim.dialogId,
      ...(domainId ? { domainId } : {}),
    },
    provenance: claim.provenance,
    actions: [],
  };
}

function domainTrailItems(truth: WhereWeAreReading): StageReadingItem[] {
  const items: StageReadingItem[] = [];
  if (truth.trail.stageBeatTitles.length > 0) {
    items.push({
      id: 'trail:beats',
      lifecycle: 'derived',
      text: `On Stage: ${truth.trail.stageBeatTitles.join(' · ')}`,
      source: { kind: 'trail', id: 'beats' },
      actions: [],
    });
  }
  if (truth.trail.chatterTitles.length > 0) {
    items.push({
      id: 'trail:chatter',
      lifecycle: 'derived',
      text: `Chatter: ${truth.trail.chatterTitles.join(', ')}`,
      source: { kind: 'trail', id: 'chatter' },
      actions: [],
    });
  }
  for (const claim of truth.claims) {
    const when = formatWhen(claim.provenance.orientationUpdatedAt ?? claim.provenance.updatedAt);
    const who = claim.provenance.orientationUpdatedBy;
    if (!when && !who && claim.provenance.chronicleCount == null) continue;
    const bits = [who ? who : null, when].filter((bit): bit is string => Boolean(bit));
    if (bits.length === 0) continue;
    items.push({
      id: `trail:provenance:${claim.dialogId}:${claim.kind}`,
      lifecycle: 'derived',
      text: `${claim.title} — ${bits.join(' · ')}`,
      source: { kind: 'trail', id: `provenance:${claim.dialogId}:${claim.kind}` },
      provenance: claim.provenance,
      actions: [],
    });
  }
  for (const row of truth.trail.history) {
    items.push({
      id: `trail:history:${row.dialogId}`,
      lifecycle: 'derived',
      text: `${row.title} — ${row.count} history ${row.count === 1 ? 'note' : 'notes'}`,
      source: { kind: 'trail', id: `history:${row.dialogId}` },
      actions: [],
    });
  }
  return items;
}

export function projectDomainWhereWeAre(input: {
  context: StageContext;
  truth: WhereWeAreReading;
}): { reading: StageReading; composition: StageComposition } {
  const items: StageReadingItem[] = [];
  const uncertainty = whereWeAreUncertainty(input.truth);
  if (uncertainty) {
    items.push({
      id: 'uncertainty:scene',
      lifecycle: 'derived',
      text: uncertainty,
      source: { kind: 'uncertainty', id: 'scene' },
      actions: [],
    });
  }
  for (const place of input.truth.places) {
    items.push({
      id: `place:${place.dialogId}`,
      lifecycle: 'derived',
      text: place.title,
      source: { kind: 'dialog', id: place.dialogId },
      actions: [
        {
          kind: 'continue',
          subject: { kind: 'dialog', id: place.dialogId },
        },
      ],
    });
    for (const claim of input.truth.claims.filter((row) => row.dialogId === place.dialogId)) {
      items.push(claimItem(claim, undefined));
    }
  }
  items.push(...domainTrailItems(input.truth));
  const reading: StageReading = { context: input.context, items };
  return { reading, composition: composeStagePass(reading, 'domain-where-we-are') };
}

export function projectRealmWhereWeAre(input: {
  context: StageContext;
  truth: RealmWhereWeAreReading;
}): { reading: StageReading; composition: StageComposition } {
  const items: StageReadingItem[] = [];
  for (const continuation of input.truth.continuations) {
    const domainId = continuation.domainId;
    items.push({
      id: `place:${domainId}`,
      lifecycle: 'derived',
      text: continuation.domainName,
      source: { kind: 'domain', id: domainId },
      actions: [
        {
          kind: 'continue',
          subject: { kind: 'domain', id: domainId },
          nextContext: {
            scope: 'domain',
            domainId,
            audience: input.context.audience,
            arriving: true,
          },
        },
      ],
    });
    const uncertainty = whereWeAreUncertainty(continuation.reading);
    if (uncertainty) {
      items.push({
        id: `uncertainty:${domainId}`,
        lifecycle: 'derived',
        text: uncertainty,
        source: { kind: 'uncertainty', id: domainId },
        actions: [],
      });
    }
    const seenClaims = new Set<string>();
    for (const place of continuation.reading.places) {
      for (const claim of continuation.reading.claims.filter((row) => row.dialogId === place.dialogId)) {
        const key = `${claim.dialogId}:${claim.kind}`;
        if (seenClaims.has(key)) continue;
        seenClaims.add(key);
        items.push(claimItem(claim, domainId));
      }
    }
  }
  if (input.truth.continuations.length === 0) {
    items.push({
      id: 'empty',
      lifecycle: 'derived',
      text: 'Nothing stored yet names a Domain to continue.',
      source: { kind: 'uncertainty', id: 'empty' },
      actions: [],
    });
  }
  items.push(...realmTrailItems(input.truth));
  const reading: StageReading = { context: input.context, items };
  return { reading, composition: composeStagePass(reading, 'realm-where-we-are') };
}

function realmTrailItems(truth: RealmWhereWeAreReading): StageReadingItem[] {
  const items: StageReadingItem[] = [];
  if (truth.face) {
    items.push({
      id: `trail:face:${truth.face.domainId}`,
      lifecycle: 'derived',
      text: `Face: ${truth.face.domainName}`,
      source: { kind: 'trail', id: `face:${truth.face.domainId}` },
      actions: [],
    });
  }
  for (const row of truth.trail.stageBeats) {
    items.push({
      id: `trail:beats:${row.domainId}`,
      lifecycle: 'derived',
      text: `${row.domainName} on Stage: ${row.titles.join(' · ')}`,
      source: { kind: 'trail', id: `beats:${row.domainId}` },
      actions: [],
    });
  }
  for (const row of truth.trail.draftForwards) {
    items.push({
      id: `trail:forward:${row.domainId}:${row.dialogId}`,
      lifecycle: 'derived',
      text: row.forwardTitle
        ? `${row.domainName} — ${row.dialogTitle} — Forward “${row.forwardTitle}”`
        : `${row.domainName} — ${row.dialogTitle} has an authored Forward`,
      source: { kind: 'trail', id: `forward:${row.domainId}:${row.dialogId}` },
      actions: [],
    });
  }
  for (const row of truth.trail.chatter) {
    items.push({
      id: `trail:chatter:${row.domainId}`,
      lifecycle: 'derived',
      text: `${row.domainName} chatter: ${row.titles.join(', ')}`,
      source: { kind: 'trail', id: `chatter:${row.domainId}` },
      actions: [],
    });
  }
  for (const continuation of truth.continuations) {
    for (const claim of continuation.reading.claims) {
      const when = formatWhen(claim.provenance.orientationUpdatedAt ?? claim.provenance.updatedAt);
      const who = claim.provenance.orientationUpdatedBy;
      if (!when && !who && !claim.provenance.forwardTitle) continue;
      const bits = [
        who ? who : null,
        when,
        claim.provenance.forwardTitle ? `Forward “${claim.provenance.forwardTitle}”` : null,
      ].filter((bit): bit is string => Boolean(bit));
      if (bits.length === 0) continue;
      items.push({
        id: `trail:provenance:${continuation.domainId}:${claim.dialogId}:${claim.kind}`,
        lifecycle: 'derived',
        text: `${continuation.domainName} — ${claim.title} — ${bits.join(' · ')}`,
        source: { kind: 'trail', id: `provenance:${continuation.domainId}:${claim.dialogId}` },
        provenance: claim.provenance,
        actions: [],
      });
    }
  }
  for (const row of truth.trail.history) {
    items.push({
      id: `trail:history:${row.domainId}:${row.dialogId}`,
      lifecycle: 'derived',
      text: `${row.domainName} — ${row.title} — ${row.count} history ${row.count === 1 ? 'note' : 'notes'}`,
      source: { kind: 'trail', id: `history:${row.domainId}:${row.dialogId}` },
      actions: [],
    });
  }
  for (const event of truth.trail.feed) {
    const when = formatWhen(event.occurredAt);
    items.push({
      id: `trail:feed:${event.id}`,
      lifecycle: 'derived',
      text: `${event.domainName ? `${event.domainName} — ` : ''}${event.summary}${when ? ` — ${when}` : ''}`,
      source: { kind: 'feed-event', id: event.id },
      actions: [],
    });
  }
  return items;
}

export function projectStoryPass(input: {
  context: StageContext;
  slides: readonly StoryPassSlide[];
  /** Domain the cover belongs to. Required for a cover cite. */
  domainId?: string | null;
  openingIndex?: number;
}): { reading: StageReading; composition: StageComposition } {
  const domainId = input.domainId?.trim() || input.context.domainId || '';
  const items: StageReadingItem[] = [];
  const root = input.slides.find((slide) => slide.kind === 'root');
  if (root && domainId) {
    items.push({
      id: 'cover-plate',
      lifecycle: 'derived',
      text: root.title,
      source: { kind: 'domain-cover', domainId },
      actions: [],
    });
  }
  for (const slide of input.slides) {
    const frameId = slide.frameMessageId?.trim() || '';
    if (frameId && slide.kind !== 'root') {
      items.push({
        id: `frame:${frameId}`,
        lifecycle: 'live',
        text: slide.title,
        source: { kind: 'frame', messageId: frameId },
        actions: [],
      });
      continue;
    }
    if (slide.kind === 'root') {
      if (!domainId) continue;
      items.push({
        id: 'root',
        lifecycle: 'derived',
        text: slide.title,
        source: { kind: 'domain-cover', domainId },
        actions: [],
      });
      continue;
    }
    const stored = slide.id !== 'now';
    items.push({
      id: `slide:${slide.id}`,
      lifecycle: stored ? 'stored' : 'derived',
      text: slide.title,
      source: {
        kind: 'stage-slide',
        id: slide.id,
        ...(slide.source ? { storySource: slide.source } : {}),
      },
      actions: [],
    });
  }
  const reading: StageReading = { context: input.context, items };
  return {
    reading,
    composition: composeStagePass(reading, 'story', input.openingIndex ?? 0),
  };
}

export function readingItem(
  reading: StageReading,
  id: string,
): StageReadingItem | null {
  return reading.items.find((item) => item.id === id) ?? null;
}

const STAGE_TRUTH_KEYS: readonly StageTruthKey[] = [
  'realm-where-we-are',
  'domain-where-we-are',
  'story',
];

const LAYOUT_SET = new Set<string>(STAGE_GROUP_LAYOUTS);
const GESTURE_SET = new Set<string>(STAGE_CITE_GESTURES);
const EMPHASIS_SET = new Set<string>(['primary', 'support', 'trail']);
const PRESENT_SET = new Set<string>(['cover', 'slide', 'frame']);
const DRESS_TITLE_SET = new Set<string>(STAGE_DRESS_TITLES);
const DRESS_FIELD_SET = new Set<string>(STAGE_DRESS_FIELDS);
const DRESS_DENSITY_SET = new Set<string>(STAGE_DRESS_DENSITIES);
const DRESS_MOTION_SET = new Set<string>(STAGE_DRESS_MOTIONS);
const DRESS_SPAN_SET = new Set<string>(STAGE_DRESS_SPANS);
const TREATMENT_SET = new Set<string>(['domain', 'stage-inherit']);

/** Sentences Rendr may try to write. They are stripped. They never become the Reading. */
const STRIPPED_NODE_KEYS = new Set(['text', 'body', 'title', 'label', 'sentence', 'copy', 'rationale']);

const NODE_KEYS: Record<string, readonly string[]> = {
  group: ['kind', 'emphasis', 'layout', 'children'],
  sequence: ['kind', 'index', 'children'],
  cite: ['kind', 'readingId', 'emphasis', 'present', 'gesture'],
  media: ['kind', 'readingId'],
};

export type StageCompositionAuthority = {
  brief?: string;
};

export type StageArrangement = {
  id: string;
  truth: StageTruthKey;
  composition: StageComposition;
  replacedId: string;
  at: string;
  brief?: string;
};

export type StageArrangementMap = Partial<Record<StageTruthKey, StageArrangement>>;

export type StageCompositionDecision =
  | {
      status: 'applied';
      composition: StageComposition;
      replacedId: string;
      summary: string;
      droppedIds: string[];
      strippedKeys: string[];
    }
  | { status: 'needs-grammar'; token: string }
  | { status: 'unsourced'; droppedIds: string[] }
  | { status: 'empty' };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isStageTruthKey(value: string): value is StageTruthKey {
  return (STAGE_TRUTH_KEYS as readonly string[]).includes(value);
}

/** Kip authorizes. The composition itself is not accepted from this object. */
export function parseStageCompositionAuthority(raw: unknown): StageCompositionAuthority | null {
  const rec = asRecord(raw);
  if (!rec || rec.authorize !== true) return null;
  const brief = typeof rec.brief === 'string' ? rec.brief.trim().slice(0, 400) : '';
  return brief ? { brief } : {};
}

export function stagePassFromAgentContext(agentContext: unknown): {
  truth: StageTruthKey;
  domainId?: string;
} | null {
  const ctx = asRecord(agentContext);
  const pass = asRecord(ctx?.stagePass);
  if (!pass) return null;
  const truth = typeof pass.truth === 'string' ? pass.truth : '';
  if (!isStageTruthKey(truth)) return null;
  const domainId = typeof pass.domainId === 'string' ? pass.domainId.trim() : '';
  return domainId ? { truth, domainId } : { truth };
}

function citeIdsOf(nodes: readonly StageNode[]): string[] {
  const ids: string[] = [];
  const walk = (node: StageNode) => {
    if (node.kind === 'cite' || node.kind === 'media') ids.push(node.readingId);
    else node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return ids;
}

export function summarizeStageComposition(composition: StageComposition): string {
  const layouts = new Set<string>();
  let cites = 0;
  let places = 0;
  const walk = (node: StageNode) => {
    if (node.kind === 'group') {
      layouts.add(node.layout);
      node.children.forEach(walk);
      return;
    }
    if (node.kind === 'sequence') {
      layouts.add('sequence');
      node.children.forEach(walk);
      return;
    }
    if (node.kind === 'cite') {
      cites += 1;
      if (node.gesture === 'place') places += 1;
    }
  };
  composition.nodes.forEach(walk);
  const layout = [...layouts].slice(0, 3).join('+') || 'arrangement';
  const span = composition.dress?.span ?? 'center';
  return `${layout} · ${cites} cites · ${places} places · ${span}`.slice(0, 120);
}

function unexpectedKey(kind: string, key: string): string | null {
  if (STRIPPED_NODE_KEYS.has(key)) return null;
  const allowed = NODE_KEYS[kind];
  if (!allowed || allowed.includes(key)) return null;
  return `${kind}.${key}`;
}

function parseDress(
  raw: unknown,
): { dress?: StageCompositionDress; token?: string } {
  if (raw == null) return {};
  const rec = asRecord(raw);
  if (!rec) return { token: 'dress' };
  const dress: StageCompositionDress = {};
  for (const [key, value] of Object.entries(rec)) {
    if (typeof value !== 'string') return { token: `dress.${key}` };
    if (key === 'title' && DRESS_TITLE_SET.has(value)) dress.title = value as StageDressTitle;
    else if (key === 'field' && DRESS_FIELD_SET.has(value)) dress.field = value as StageDressField;
    else if (key === 'density' && DRESS_DENSITY_SET.has(value)) dress.density = value as StageDressDensity;
    else if (key === 'motion' && DRESS_MOTION_SET.has(value)) dress.motion = value as StageDressMotion;
    else if (key === 'span' && DRESS_SPAN_SET.has(value)) dress.span = value as StageDressSpan;
    else return { token: `dress.${key}` };
  }
  return { dress };
}

function parseNode(
  raw: unknown,
  stripped: string[],
): { node?: StageNode; token?: string } {
  const rec = asRecord(raw);
  if (!rec) return { token: 'node' };
  const kind = typeof rec.kind === 'string' ? rec.kind : '';
  if (!NODE_KEYS[kind]) return { token: kind ? `kind:${kind}` : 'kind' };
  for (const key of Object.keys(rec)) {
    if (STRIPPED_NODE_KEYS.has(key)) {
      stripped.push(`${kind}.${key}`);
      continue;
    }
    const token = unexpectedKey(kind, key);
    if (token) return { token };
  }
  if (kind === 'group' || kind === 'sequence') {
    if (!Array.isArray(rec.children)) return { token: `${kind}.children` };
    const children: StageNode[] = [];
    for (const child of rec.children) {
      const parsed = parseNode(child, stripped);
      if (parsed.token) return parsed;
      if (parsed.node) children.push(parsed.node);
    }
    if (kind === 'sequence') {
      if (typeof rec.index !== 'number' || !Number.isFinite(rec.index)) return { token: 'sequence.index' };
      return { node: { kind: 'sequence', index: rec.index, children } };
    }
    const emphasis = typeof rec.emphasis === 'string' ? rec.emphasis : '';
    const layout = typeof rec.layout === 'string' ? rec.layout : '';
    if (!EMPHASIS_SET.has(emphasis)) return { token: `emphasis:${emphasis || 'missing'}` };
    if (!LAYOUT_SET.has(layout)) return { token: `layout:${layout || 'missing'}` };
    return {
      node: {
        kind: 'group',
        emphasis: emphasis as StageEmphasis,
        layout: layout as StageGroupLayout,
        children,
      },
    };
  }
  const readingId = typeof rec.readingId === 'string' ? rec.readingId.trim() : '';
  if (!readingId || readingId.length > 160) return { token: 'readingId' };
  if (kind === 'media') return { node: { kind: 'media', readingId } };
  const emphasis = typeof rec.emphasis === 'string' ? rec.emphasis : '';
  if (!EMPHASIS_SET.has(emphasis)) return { token: `emphasis:${emphasis || 'missing'}` };
  const cite: Extract<StageNode, { kind: 'cite' }> = {
    kind: 'cite',
    readingId,
    emphasis: emphasis as StageEmphasis,
  };
  if ('present' in rec && rec.present != null) {
    const present = typeof rec.present === 'string' ? rec.present : '';
    if (!PRESENT_SET.has(present)) return { token: `present:${present || 'missing'}` };
    cite.present = present as StagePresent;
  }
  if ('gesture' in rec && rec.gesture != null) {
    const gesture = typeof rec.gesture === 'string' ? rec.gesture : '';
    if (!GESTURE_SET.has(gesture)) return { token: `gesture:${gesture || 'missing'}` };
    cite.gesture = gesture as StageCiteGesture;
  }
  return { node: cite };
}

/**
 * Rendr proposes a Composition against a Reading.
 * Unknown tokens refuse the proposal. Cites the Reading does not contain are dropped.
 * Node text is stripped, so a proposal cannot invent a sentence.
 */
export function decideStageComposition(input: {
  raw: unknown;
  reading: StageReading;
  truth: StageTruthKey;
  previousId: string;
  id?: string;
}): StageCompositionDecision {
  const rec = asRecord(input.raw);
  if (!rec || !Array.isArray(rec.nodes)) return { status: 'needs-grammar', token: 'nodes' };
  for (const key of Object.keys(rec)) {
    if (['id', 'context', 'treatment', 'nodes', 'dress', 'rationale'].includes(key)) continue;
    if (STRIPPED_NODE_KEYS.has(key)) continue;
    return { status: 'needs-grammar', token: key };
  }
  if ('treatment' in rec && rec.treatment != null) {
    const treatment = typeof rec.treatment === 'string' ? rec.treatment : '';
    if (!TREATMENT_SET.has(treatment)) return { status: 'needs-grammar', token: `treatment:${treatment || 'missing'}` };
  }
  const dressed = parseDress(rec.dress);
  if (dressed.token) return { status: 'needs-grammar', token: dressed.token };
  const stripped: string[] = [];
  const nodes: StageNode[] = [];
  for (const item of rec.nodes) {
    const parsed = parseNode(item, stripped);
    if (parsed.token) return { status: 'needs-grammar', token: parsed.token };
    if (parsed.node) nodes.push(parsed.node);
  }
  if (nodes.length === 0) return { status: 'empty' };
  const proposedIds = citeIdsOf(nodes);
  if (proposedIds.length === 0) return { status: 'empty' };
  const treatment = input.truth === 'story' ? 'stage-inherit' : 'domain';
  const bound = dropUnsourcedNodes(
    {
      id: input.id?.trim() || input.previousId,
      context: input.reading.context,
      treatment,
      ...(dressed.dress ? { dress: dressed.dress } : { dress: defaultStageDress(input.truth) }),
      nodes,
    },
    input.reading,
  );
  const kept = new Set(citeIdsOf(bound.nodes));
  const droppedIds = proposedIds.filter((id) => !kept.has(id));
  if (kept.size === 0) return { status: 'unsourced', droppedIds };
  const composition: StageComposition = {
    ...bound,
    id: input.id?.trim() || `comp-${kept.size}-${droppedIds.length}`,
  };
  return {
    status: 'applied',
    composition,
    replacedId: input.previousId,
    summary: summarizeStageComposition(composition),
    droppedIds,
    strippedKeys: stripped,
  };
}

/** A stored arrangement shown against the Reading now. Null falls back to the deterministic pass. */
export function presentStoredArrangement(
  stored: StageComposition,
  reading: StageReading,
): StageComposition | null {
  const presented = dropUnsourcedNodes({ ...stored, context: reading.context }, reading);
  if (citeIdsOf(presented.nodes).length === 0) return null;
  return presented;
}

function parseStoredComposition(raw: unknown, context: StageContext): StageComposition | null {
  const rec = asRecord(raw);
  if (!rec || !Array.isArray(rec.nodes)) return null;
  const stripped: string[] = [];
  const nodes: StageNode[] = [];
  for (const item of rec.nodes) {
    const parsed = parseNode(item, stripped);
    if (parsed.token || !parsed.node) return null;
    nodes.push(parsed.node);
  }
  const dressed = parseDress(rec.dress);
  if (dressed.token) return null;
  const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim().slice(0, 80) : '';
  if (!id) return null;
  const treatment = rec.treatment === 'stage-inherit' ? 'stage-inherit' : 'domain';
  return {
    id,
    context,
    treatment,
    nodes,
    ...(dressed.dress ? { dress: dressed.dress } : {}),
  };
}

export function parseStageArrangementMap(raw: unknown): StageArrangementMap | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const map: StageArrangementMap = {};
  for (const truth of STAGE_TRUTH_KEYS) {
    const row = asRecord(rec[truth]);
    if (!row) continue;
    const id = typeof row.id === 'string' ? row.id.trim().slice(0, 80) : '';
    const replacedId = typeof row.replacedId === 'string' ? row.replacedId.trim().slice(0, 80) : '';
    const at = typeof row.at === 'string' ? row.at.trim().slice(0, 40) : '';
    const composition = parseStoredComposition(row.composition, {
      scope: truth === 'realm-where-we-are' ? 'realm' : 'domain',
      audience: 'admin',
      arriving: truth !== 'story',
    });
    if (!id || !replacedId || !at || !composition) continue;
    const brief = typeof row.brief === 'string' ? row.brief.trim().slice(0, 400) : '';
    map[truth] = {
      id,
      truth,
      composition,
      replacedId,
      at,
      ...(brief ? { brief } : {}),
    };
  }
  return Object.keys(map).length ? map : undefined;
}

export function mergeStageArrangementPatch(
  current: StageArrangementMap | undefined,
  patch: unknown,
): StageArrangementMap | undefined {
  const rec = asRecord(patch);
  if (!rec) return current;
  const next: StageArrangementMap = { ...(current ?? {}) };
  for (const key of Object.keys(rec)) {
    if (!isStageTruthKey(key)) continue;
    if (rec[key] == null) {
      delete next[key];
      continue;
    }
    const parsed = parseStageArrangementMap({ [key]: rec[key] });
    const row = parsed?.[key];
    if (row) next[key] = row;
  }
  return Object.keys(next).length ? next : undefined;
}
