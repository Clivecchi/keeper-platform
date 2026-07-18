/**
 * Realm staged nav — Drafts → Kept → Presented.
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

export interface RealmNavEntry {
  id: string
  kind: RealmNavEntryKind
  stage: RealmNavStage
  label: string
  description?: string
  /** Atomic Point card for Chronicle / DocumentShell. */
  point: Point
}

export function draftToRealmNavEntry(draft: KipDraftSummary): RealmNavEntry {
  const title = draft.title?.trim() || "Untitled draft"
  return {
    id: draft.id,
    kind: "draft",
    stage: "drafts",
    label: title,
    description: draft.kind,
    point: {
      identity: { label: "Draft", subtitle: draft.kind },
      title,
      lede: draft.summary?.trim() || undefined,
      body: {
        text: draft.summary?.trim() || "In progress — open in Chronicle to continue shaping.",
        clampLines: 4,
        expandable: false,
      },
      status: { label: draft.status, tone: "pending" },
    },
  }
}

export function libraryRowToKeptNavEntry(row: LibraryNavRow): RealmNavEntry {
  const title = libraryItemChronicleTitle(row)
  return {
    id: row.id,
    kind: "library",
    stage: "kept",
    label: title,
    description: row.source_type,
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

export function momentToKeptNavEntry(moment: KeptMomentSummary): RealmNavEntry {
  const title = moment.title?.trim() || "Untitled moment"
  const bodyText = moment.body?.trim()
  return {
    id: moment.id,
    kind: "moment",
    stage: "kept",
    label: title,
    description: "Moment",
    point: {
      identity: { label: "Moment", subtitle: "Kept" },
      title,
      lede: bodyText || undefined,
      body: {
        text: bodyText || "A kept moment on this domain.",
        clampLines: 4,
        expandable: true,
      },
      status: { label: "Kept", tone: "active" },
    },
  }
}

export function libraryRowToPresentedNavEntry(row: LibraryNavRow): RealmNavEntry {
  const title = libraryItemChronicleTitle(row)
  return {
    id: row.id,
    kind: "library",
    stage: "presented",
    label: title,
    description: "Public-ready",
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

export function groupRealmNavEntries(
  entries: RealmNavEntry[],
): Record<RealmNavStage, RealmNavEntry[]> {
  return {
    drafts: entries.filter((e) => e.stage === "drafts"),
    kept: entries.filter((e) => e.stage === "kept"),
    presented: entries.filter((e) => e.stage === "presented"),
  }
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
