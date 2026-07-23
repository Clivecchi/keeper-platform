/**
 * Realm staged nav — Drafts → Kept → Presented, scoped by Dialog.
 * Nav rows are Point-shaped summaries (atomic cards), not static categories.
 */

import type { Point } from "@keeper/shared"
import type { KipDraftSummary } from "../../lib/kipApi"
import type { KeptMomentSummary } from "../api/v0Moments"
import type { LibraryNavRow } from "../presence/integrationChronicle/libraryNavUtils"
import { libraryItemChronicleTitle } from "../presence/integrationChronicle/libraryNavUtils"
import { buildLibraryGlossAnchor } from "@keeper/shared"

export type RealmNavStage = "drafts" | "kept" | "presented"

export type RealmNavEntryKind = "draft" | "library" | "moment"

/** Sentinel key for entries with no resolvable dialog_id. */
export const REALM_NAV_UNASSIGNED_KEY = "unassigned"

export const REALM_NAV_UNASSIGNED_LABEL = "Unassigned"

export interface RealmNavEntry {
  id: string
  kind: RealmNavEntryKind
  stage: RealmNavStage
  label: string
  description?: string
  /** Owning Dialog id when resolvable; null → Unassigned. */
  dialogId?: string | null
  /** Path id when resolvable — used to build DocumentShell `paths`. */
  pathId?: string | null
  /** Path display name when resolvable. */
  pathName?: string | null
  /** Atomic Point card for Chronicle / DocumentShell. */
  point: Point
}

/** Short teaser for Point.lede — omitted when nothing shorter than the body exists. */
export function pointLedeFromBody(fullText: string | undefined | null): string | undefined {
  const text = fullText?.trim()
  if (!text) return undefined
  const sentenceMatch = text.match(/^(.+?[.!?])(\s|$)/)
  const sentence = sentenceMatch?.[1]?.trim()
  if (sentence && sentence.length < text.length && sentence.length <= 160) {
    return sentence
  }
  if (text.length <= 120) return undefined
  const clipped = text.slice(0, 117).trimEnd()
  const lastSpace = clipped.lastIndexOf(" ")
  const teaser = (lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped).trimEnd()
  return teaser ? `${teaser}…` : undefined
}

/** One Dialog (or Unassigned) with stage buckets inside. */
export interface RealmNavDialogGroup {
  dialogId: string | null
  title: string
  byStage: Record<RealmNavStage, RealmNavEntry[]>
}

export interface RealmNavGrouped {
  byStage: Record<RealmNavStage, RealmNavEntry[]>
  byDialog: RealmNavDialogGroup[]
}

export function emptyRealmNavByStage(): Record<RealmNavStage, RealmNavEntry[]> {
  return { drafts: [], kept: [], presented: [] }
}

export function emptyRealmNavGrouped(): RealmNavGrouped {
  return { byStage: emptyRealmNavByStage(), byDialog: [] }
}

export function draftToRealmNavEntry(
  draft: KipDraftSummary,
  dialogId?: string | null,
): RealmNavEntry {
  const title = draft.title?.trim() || "Untitled draft"
  const bodyText =
    draft.summary?.trim() || "In progress — open in Chronicle to continue shaping."
  return {
    id: draft.id,
    kind: "draft",
    stage: "drafts",
    label: title,
    description: draft.kind,
    dialogId: dialogId ?? null,
    point: {
      identity: { label: "Draft", subtitle: draft.kind },
      title,
      lede: pointLedeFromBody(draft.summary),
      body: {
        text: bodyText,
        clampLines: 4,
        expandable: false,
      },
      status: { label: draft.status, tone: "pending" },
    },
  }
}

export function libraryRowToKeptNavEntry(
  row: LibraryNavRow,
  dialogId?: string | null,
): RealmNavEntry {
  const title = libraryItemChronicleTitle(row)
  return {
    id: row.id,
    kind: "library",
    stage: "kept",
    label: title,
    description: row.source_type,
    dialogId: dialogId ?? null,
    point: {
      identity: { label: "Library", subtitle: row.source_type },
      title,
      body: {
        text: "Settled in the domain library.",
        clampLines: 3,
        expandable: false,
      },
      status: { label: "Kept", tone: "active" },
      gloss: { anchor: buildLibraryGlossAnchor(row.id) },
    },
  }
}

export function momentToKeptNavEntry(
  moment: KeptMomentSummary,
  dialogId?: string | null,
): RealmNavEntry {
  const title = moment.title?.trim() || "Untitled moment"
  const bodyText = moment.body?.trim()
  return {
    id: moment.id,
    kind: "moment",
    stage: "kept",
    label: title,
    description: "Moment",
    dialogId: dialogId ?? null,
    pathId: moment.pathId?.trim() || null,
    pathName: moment.pathName?.trim() || null,
    point: {
      identity: { label: "Moment", subtitle: "Kept" },
      title,
      lede: pointLedeFromBody(bodyText),
      body: {
        text: bodyText || "A kept moment on this domain.",
        clampLines: 4,
        expandable: true,
      },
      status: { label: "Kept", tone: "active" },
    },
  }
}

export function libraryRowToPresentedNavEntry(
  row: LibraryNavRow,
  dialogId?: string | null,
): RealmNavEntry {
  const title = libraryItemChronicleTitle(row)
  return {
    id: row.id,
    kind: "library",
    stage: "presented",
    label: title,
    description: "Public-ready",
    dialogId: dialogId ?? null,
    point: {
      identity: { label: "Presented", subtitle: row.source_type },
      title,
      body: {
        text: "Ready for the Present surface — show when you are.",
        clampLines: 3,
        expandable: false,
      },
      status: { label: "Presented", tone: "active" },
      gloss: { anchor: buildLibraryGlossAnchor(row.id) },
    },
  }
}

function stageBuckets(entries: RealmNavEntry[]): Record<RealmNavStage, RealmNavEntry[]> {
  return {
    drafts: entries.filter((e) => e.stage === "drafts"),
    kept: entries.filter((e) => e.stage === "kept"),
    presented: entries.filter((e) => e.stage === "presented"),
  }
}

/**
 * Group nav entries by Dialog first, stage second.
 * Entries with no resolvable dialogId land in an explicit Unassigned group.
 */
export function groupRealmNavEntries(
  entries: RealmNavEntry[],
  dialogTitleById: ReadonlyMap<string, string> = new Map(),
): RealmNavGrouped {
  const byStage = stageBuckets(entries)

  const groups = new Map<string, RealmNavEntry[]>()
  // Seed every real, active Dialog (dialogTitleById only ever holds non-archived
  // dialogs) so it appears in Nav even with zero content -- a Dialog is a real
  // "start here" entry point, not something that only exists once it has drafts.
  for (const dialogId of dialogTitleById.keys()) {
    if (!groups.has(dialogId)) groups.set(dialogId, [])
  }
  for (const entry of entries) {
    const key = entry.dialogId?.trim() ? entry.dialogId.trim() : REALM_NAV_UNASSIGNED_KEY
    const bucket = groups.get(key)
    if (bucket) bucket.push(entry)
    else groups.set(key, [entry])
  }

  const namedKeys = [...groups.keys()].filter((k) => k !== REALM_NAV_UNASSIGNED_KEY)
  namedKeys.sort((a, b) => {
    const ta = dialogTitleById.get(a)?.trim() || a
    const tb = dialogTitleById.get(b)?.trim() || b
    return ta.localeCompare(tb, undefined, { sensitivity: "base" })
  })

  const orderedKeys = [
    ...namedKeys,
    ...(groups.has(REALM_NAV_UNASSIGNED_KEY) ? [REALM_NAV_UNASSIGNED_KEY] : []),
  ]

  const byDialog: RealmNavDialogGroup[] = orderedKeys.map((key) => {
    const groupEntries = groups.get(key) ?? []
    const isUnassigned = key === REALM_NAV_UNASSIGNED_KEY
    return {
      dialogId: isUnassigned ? null : key,
      title: isUnassigned
        ? REALM_NAV_UNASSIGNED_LABEL
        : dialogTitleById.get(key)?.trim() || "Untitled dialog",
      byStage: stageBuckets(groupEntries),
    }
  })

  return { byStage, byDialog }
}

export const REALM_STAGE_LABELS: Record<RealmNavStage, string> = {
  drafts: "Drafts",
  kept: "Kept",
  presented: "Presented",
}

export const REALM_STAGE_EMPTY_COPY: Record<RealmNavStage, string> = {
  drafts: "Nothing in progress yet.",
  kept: "Nothing settled yet.",
  presented: "Nothing public-ready yet.",
}
