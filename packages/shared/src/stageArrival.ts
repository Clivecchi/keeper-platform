/**
 * Domain arrival on the existing Stage.
 * The resolver says which presentation to show, and which stored facts
 * "Where are we?" can stand on. It does not write copy.
 */

import type { DomainAudienceRole } from './domains/resolveDomainAudience.js';
import { isAuthoredDocumentForward } from './document.js';
import { isChatterTitleSource, isDialogNavTitleSource } from './dialogTitleSource.js';

export type StagePresentationKey = 'where-we-are' | 'story';

export function resolveStagePresentation(input: {
  audience: DomainAudienceRole;
  arriving: boolean;
}): StagePresentationKey {
  if (input.audience === 'admin' && input.arriving) return 'where-we-are';
  return 'story';
}

export type WhereWeAreClaimKind =
  | 'kept-orientation'
  | 'cleared-orientation-with-forward'
  | 'recent-kept-dialog';

export type WhereWeAreDialogInput = {
  id: string;
  title: string;
  titleSource?: string | null;
  documentStatus?: string | null;
  orientation?: string | null;
  orientationUpdatedAt?: string | null;
  orientationUpdatedBy?: string | null;
  forwardTitle?: string | null;
  forwardDescription?: string | null;
  updatedAt?: string | null;
  chronicleCount?: number | null;
};

export type WhereWeAreProvenance = {
  orientationUpdatedBy?: string;
  orientationUpdatedAt?: string;
  forwardTitle?: string;
  updatedAt?: string;
  chronicleCount?: number;
};

export type WhereWeAreClaim = {
  kind: WhereWeAreClaimKind;
  dialogId: string;
  title: string;
  provenance: WhereWeAreProvenance;
};

export type WhereWeArePlace = {
  dialogId: string;
  title: string;
};

export type WhereWeAreReading = {
  /** One entry per Dialog named by a claim, in claim order. */
  places: WhereWeArePlace[];
  claims: WhereWeAreClaim[];
  trail: {
    stageBeatTitles: string[];
    chatterTitles: string[];
    history: Array<{ dialogId: string; title: string; count: number }>;
  };
};

function trimmed(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function namedDialog(row: WhereWeAreDialogInput): boolean {
  return isDialogNavTitleSource(row.titleSource) && Boolean(trimmed(row.title)) && Boolean(trimmed(row.id));
}

function provenanceFor(row: WhereWeAreDialogInput): WhereWeAreProvenance {
  const orientationUpdatedBy = trimmed(row.orientationUpdatedBy);
  const orientationUpdatedAt = trimmed(row.orientationUpdatedAt);
  const forwardTitle = trimmed(row.forwardTitle);
  const updatedAt = trimmed(row.updatedAt);
  const chronicleCount =
    typeof row.chronicleCount === 'number' && row.chronicleCount > 0
      ? row.chronicleCount
      : undefined;
  return {
    ...(orientationUpdatedBy ? { orientationUpdatedBy } : {}),
    ...(orientationUpdatedAt ? { orientationUpdatedAt } : {}),
    ...(forwardTitle ? { forwardTitle } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(chronicleCount !== undefined ? { chronicleCount } : {}),
  };
}

function timeValue(value: string | null | undefined): number {
  const parsed = Date.parse(trimmed(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function byNewestStamp(a: WhereWeAreDialogInput, b: WhereWeAreDialogInput): number {
  const delta = timeValue(b.orientationUpdatedAt) - timeValue(a.orientationUpdatedAt);
  if (delta !== 0) return delta;
  return trimmed(a.title).localeCompare(trimmed(b.title));
}

export function resolveWhereWeAre(input: {
  dialogs: readonly WhereWeAreDialogInput[];
  stageBeatTitles?: readonly string[];
}): WhereWeAreReading {
  const dialogs = input.dialogs.filter((row) => trimmed(row.id) && trimmed(row.title));
  const named = dialogs.filter(namedDialog);

  const keptOrientation = named
    .filter((row) => Boolean(trimmed(row.orientation)))
    .sort(byNewestStamp);

  const clearedWithForward = named
    .filter(
      (row) =>
        !trimmed(row.orientation) &&
        Boolean(trimmed(row.orientationUpdatedAt)) &&
        isAuthoredDocumentForward({
          forwardTitle: row.forwardTitle,
          forwardDescription: row.forwardDescription,
        }),
    )
    .sort(byNewestStamp);

  const recentKept = named
    .filter((row) => row.documentStatus === 'kept')
    .sort((a, b) => {
      const delta = timeValue(b.updatedAt) - timeValue(a.updatedAt);
      if (delta !== 0) return delta;
      return trimmed(a.title).localeCompare(trimmed(b.title));
    })[0];

  const claims: WhereWeAreClaim[] = [
    ...keptOrientation.map(
      (row): WhereWeAreClaim => ({
        kind: 'kept-orientation',
        dialogId: trimmed(row.id),
        title: trimmed(row.title),
        provenance: provenanceFor(row),
      }),
    ),
    ...clearedWithForward.map(
      (row): WhereWeAreClaim => ({
        kind: 'cleared-orientation-with-forward',
        dialogId: trimmed(row.id),
        title: trimmed(row.title),
        provenance: provenanceFor(row),
      }),
    ),
    ...(recentKept
      ? [
          {
            kind: 'recent-kept-dialog' as const,
            dialogId: trimmed(recentKept.id),
            title: trimmed(recentKept.title),
            provenance: provenanceFor(recentKept),
          },
        ]
      : []),
  ];

  const places: WhereWeArePlace[] = [];
  const seen = new Set<string>();
  for (const claim of claims) {
    if (seen.has(claim.dialogId)) continue;
    seen.add(claim.dialogId);
    places.push({ dialogId: claim.dialogId, title: claim.title });
  }

  const history = dialogs
    .filter((row) => typeof row.chronicleCount === 'number' && row.chronicleCount > 0)
    .map((row) => ({
      dialogId: trimmed(row.id),
      title: trimmed(row.title),
      count: row.chronicleCount as number,
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));

  const chatterTitles = dialogs
    .filter((row) => isChatterTitleSource(row.titleSource))
    .map((row) => trimmed(row.title))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const stageBeatTitles = (input.stageBeatTitles ?? [])
    .map((title) => title.trim())
    .filter(Boolean);

  return {
    places,
    claims,
    trail: { stageBeatTitles, chatterTitles, history },
  };
}
