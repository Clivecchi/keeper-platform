import type { KipDraftSummary } from "../../../lib/kipApi"
import { formatDraftKindLabel } from "./draftManuscriptUtils"

export const HIDDEN_DRAFT_NAV_STATUSES = new Set(["promoted", "archived"])

const GENERIC_DRAFT_TITLES = new Set([
  "untitled draft",
  "untitled",
  "new draft",
  "draft",
  "cover proposal",
  "commons proposal",
])

const DRAFT_KIND_ORDER = [
  "journey_spec",
  "domain_json",
  "keeper_type_proposal",
  "vehicle_template",
  "checklist_spec",
] as const

export type DraftNavGroup = {
  kind: string
  drafts: KipDraftSummary[]
}

function draftUpdatedAtMs(draft: KipDraftSummary): number {
  const raw = draft.updatedAt
  if (!raw) return 0
  const ms = new Date(raw).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

function normalizeDraftTitle(title: string | undefined): string {
  return (title?.trim() || "Untitled draft").toLowerCase()
}

function isGenericDraftTitle(title: string | undefined): boolean {
  return GENERIC_DRAFT_TITLES.has(normalizeDraftTitle(title))
}

function formatDraftStatusLabel(status: string): string {
  return status.replace(/_/g, " ")
}

function kindSortIndex(kind: string): number {
  const index = DRAFT_KIND_ORDER.indexOf(kind as (typeof DRAFT_KIND_ORDER)[number])
  return index === -1 ? DRAFT_KIND_ORDER.length : index
}

export function filterVisibleDraftNavRows(drafts: KipDraftSummary[]): KipDraftSummary[] {
  return drafts.filter((draft) => !HIDDEN_DRAFT_NAV_STATUSES.has(draft.status))
}

export function countDraftNavTitles(drafts: KipDraftSummary[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const draft of drafts) {
    const key = normalizeDraftTitle(draft.title)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function sortDraftsForNav(
  drafts: KipDraftSummary[],
  selectedDraftId?: string | null,
): KipDraftSummary[] {
  return [...drafts].sort((a, b) => {
    const aSelected = a.id === selectedDraftId ? 1 : 0
    const bSelected = b.id === selectedDraftId ? 1 : 0
    if (aSelected !== bSelected) return bSelected - aSelected
    return draftUpdatedAtMs(b) - draftUpdatedAtMs(a)
  })
}

export function groupDraftsByKind(
  drafts: KipDraftSummary[],
  selectedDraftId?: string | null,
): DraftNavGroup[] {
  const byKind = new Map<string, KipDraftSummary[]>()
  for (const draft of drafts) {
    const kind = draft.kind?.trim() || "draft"
    const group = byKind.get(kind) ?? []
    group.push(draft)
    byKind.set(kind, group)
  }

  return [...byKind.entries()]
    .sort(([kindA], [kindB]) => {
      const orderDiff = kindSortIndex(kindA) - kindSortIndex(kindB)
      if (orderDiff !== 0) return orderDiff
      return kindA.localeCompare(kindB)
    })
    .map(([kind, groupDrafts]) => ({
      kind,
      drafts: sortDraftsForNav(groupDrafts, selectedDraftId),
    }))
}

export function draftNavLabel(
  draft: KipDraftSummary,
  titleCounts: Map<string, number>,
): string {
  const title = draft.title?.trim() || "Untitled draft"
  const titleKey = normalizeDraftTitle(title)
  const isRepeated = (titleCounts.get(titleKey) ?? 0) > 1
  const isGeneric = isGenericDraftTitle(title)

  if (isGeneric || isRepeated) {
    const kindPart = formatDraftKindLabel(draft.kind)
    const statusPart = formatDraftStatusLabel(draft.status)
    const composed = `${kindPart} · ${statusPart}`
    if (composed.length > 52) return `${composed.slice(0, 49)}…`
    return composed
  }

  return title
}
