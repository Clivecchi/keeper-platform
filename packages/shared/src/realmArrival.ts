/**
 * Realm arrival on the existing Stage.
 * Composes each Domain's existing "Where are we?" reading.
 * A Domain is a continuation only when that reading names a place.
 * The Realm's face is identity. It is not the current Domain.
 */

import { isAuthoredDocumentForward } from './document.js';
import { isDialogNavTitleSource } from './dialogTitleSource.js';
import {
  resolveWhereWeAre,
  type WhereWeAreDialogInput,
  type WhereWeAreReading,
} from './stageArrival.js';

export type RealmDomainSignals = {
  id: string;
  slug: string;
  name: string;
  /** users.primaryDomainId — the face of the Realm, not where we are. */
  face?: boolean;
  dialogs: readonly WhereWeAreDialogInput[];
  stageBeatTitles?: readonly string[];
};

export type RealmWhereWeAreFeedSignal = {
  id: string;
  occurredAt: string;
  domainName: string;
  summary: string;
};

export type RealmWhereWeAreContinuation = {
  domainId: string;
  domainSlug: string;
  domainName: string;
  reading: WhereWeAreReading;
};

export type RealmDraftForward = {
  domainId: string;
  domainName: string;
  dialogId: string;
  dialogTitle: string;
  forwardTitle: string;
};

export type RealmWhereWeAreReading = {
  continuations: RealmWhereWeAreContinuation[];
  /** Present when a Domain is marked as the Realm face. Never a continuation by itself. */
  face: { domainId: string; domainSlug: string; domainName: string } | null;
  trail: {
    stageBeats: Array<{ domainId: string; domainName: string; titles: string[] }>;
    draftForwards: RealmDraftForward[];
    chatter: Array<{ domainId: string; domainName: string; titles: string[] }>;
    history: Array<{ domainId: string; domainName: string; dialogId: string; title: string; count: number }>;
    feed: RealmWhereWeAreFeedSignal[];
  };
};

function trimmed(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function byName(a: { name: string; id: string }, b: { name: string; id: string }): number {
  const name = a.name.localeCompare(b.name);
  if (name !== 0) return name;
  return a.id.localeCompare(b.id);
}

function namedDialog(row: WhereWeAreDialogInput): boolean {
  return isDialogNavTitleSource(row.titleSource) && Boolean(trimmed(row.title)) && Boolean(trimmed(row.id));
}

export function resolveRealmWhereWeAre(input: {
  domains: readonly RealmDomainSignals[];
  feed?: readonly RealmWhereWeAreFeedSignal[];
}): RealmWhereWeAreReading {
  const domains = input.domains
    .map((domain) => ({
      id: trimmed(domain.id),
      slug: trimmed(domain.slug),
      name: trimmed(domain.name),
      face: domain.face === true,
      dialogs: domain.dialogs,
      stageBeatTitles: (domain.stageBeatTitles ?? []).map((title) => title.trim()).filter(Boolean),
    }))
    .filter((domain) => domain.id && domain.slug && domain.name)
    .sort(byName);

  const faceDomain = domains.find((domain) => domain.face) ?? null;
  const continuations: RealmWhereWeAreContinuation[] = [];
  const stageBeats: RealmWhereWeAreReading['trail']['stageBeats'] = [];
  const draftForwards: RealmDraftForward[] = [];
  const chatter: RealmWhereWeAreReading['trail']['chatter'] = [];
  const history: RealmWhereWeAreReading['trail']['history'] = [];

  for (const domain of domains) {
    const reading = resolveWhereWeAre({
      dialogs: domain.dialogs,
      stageBeatTitles: domain.stageBeatTitles,
    });
    if (reading.places.length > 0) {
      continuations.push({
        domainId: domain.id,
        domainSlug: domain.slug,
        domainName: domain.name,
        reading,
      });
    }
    if (domain.stageBeatTitles.length > 0) {
      stageBeats.push({
        domainId: domain.id,
        domainName: domain.name,
        titles: domain.stageBeatTitles,
      });
    }
    if (reading.trail.chatterTitles.length > 0) {
      chatter.push({
        domainId: domain.id,
        domainName: domain.name,
        titles: reading.trail.chatterTitles,
      });
    }
    for (const row of reading.trail.history) {
      history.push({
        domainId: domain.id,
        domainName: domain.name,
        dialogId: row.dialogId,
        title: row.title,
        count: row.count,
      });
    }

    const places = new Set(reading.places.map((place) => place.dialogId));
    const forwards = domain.dialogs
      .filter(
        (row) =>
          namedDialog(row) &&
          row.documentStatus !== 'kept' &&
          !places.has(trimmed(row.id)) &&
          isAuthoredDocumentForward({
            forwardTitle: row.forwardTitle,
            forwardDescription: row.forwardDescription,
          }),
      )
      .map((row) => ({
        domainId: domain.id,
        domainName: domain.name,
        dialogId: trimmed(row.id),
        dialogTitle: trimmed(row.title),
        forwardTitle: trimmed(row.forwardTitle),
      }))
      .sort((a, b) => a.dialogTitle.localeCompare(b.dialogTitle) || a.dialogId.localeCompare(b.dialogId));
    draftForwards.push(...forwards);
  }

  const feed = (input.feed ?? [])
    .map((event) => ({
      id: trimmed(event.id),
      occurredAt: trimmed(event.occurredAt),
      domainName: trimmed(event.domainName),
      summary: trimmed(event.summary),
    }))
    .filter((event) => event.id && event.summary)
    .sort((a, b) => {
      const time = Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
      if (time !== 0 && !Number.isNaN(time)) return time;
      return a.id.localeCompare(b.id);
    });

  return {
    continuations,
    face: faceDomain
      ? { domainId: faceDomain.id, domainSlug: faceDomain.slug, domainName: faceDomain.name }
      : null,
    trail: { stageBeats, draftForwards, chatter, history, feed },
  };
}
