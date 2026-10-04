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

export type StageNode =
  | {
      kind: 'group';
      emphasis: StageEmphasis;
      layout: 'stack';
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
    }
  | {
      kind: 'media';
      readingId: string;
    };

export type StageComposition = {
  /** Identity of this pass. Not persisted. */
  id: string;
  context: StageContext;
  treatment: 'domain' | 'stage-inherit';
  nodes: StageNode[];
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
