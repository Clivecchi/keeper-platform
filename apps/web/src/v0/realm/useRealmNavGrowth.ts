"use client"

import * as React from "react"
import { KipApi, type KipDraft, type KipDraftSummary } from "../../lib/kipApi"
import { apiFetch } from "../../lib/apiFetch"
import { getKeptMoments, type KeptMomentSummary } from "../api/v0Moments"
import { fetchDomainLibraryNavRows } from "../presence/integrationChronicle/libraryNavUtils"
import {
  DOCUMENT_MANUSCRIPT_KIND,
  draftToRealmNavEntry,
  emptyRealmNavGrouped,
  groupRealmNavEntries,
  libraryRowToKeptNavEntry,
  libraryRowToPresentedNavEntry,
  momentToKeptNavEntry,
  type RealmNavDialogGroup,
  type RealmNavEntry,
  type RealmNavGrouped,
  type RealmNavStage,
} from "./realmNavGrowth"

export interface RealmNavGrowthState {
  loading: boolean
  error: string | null
  byStage: Record<RealmNavStage, RealmNavEntry[]>
  byDialog: RealmNavDialogGroup[]
  refresh: () => void
}

type DialogListRow = {
  id?: string
  title?: string | null
}

type MomentLineageFields = KeptMomentSummary & {
  sourceDraftId?: string | null
  source_draft_id?: string | null
}

type RealmNavGrowthPayload = {
  grouped: RealmNavGrouped
}

/** In-flight dedupe — Nav + Chronicle both call this hook; one load per domain. */
const growthInflight = new Map<string, Promise<RealmNavGrowthPayload>>()

function readDraftDialogId(
  draft: KipDraftSummary | KipDraft | null | undefined,
): string | null {
  if (!draft) return null
  const row = draft as KipDraftSummary & {
    dialog_id?: string | null
    dialogId?: string | null
  }
  const id = row.dialog_id ?? row.dialogId
  return typeof id === "string" && id.trim() ? id.trim() : null
}

function readDraftPointIds(draft: KipDraftSummary | KipDraft | null | undefined): string[] {
  if (!draft) return []
  const fromList = (draft as KipDraftSummary).pointIds
  if (Array.isArray(fromList)) {
    return fromList.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
  }
  const points = (draft as KipDraft).spec?.points
  if (!Array.isArray(points)) return []
  return points
    .map((point) => (typeof point?.id === "string" ? point.id.trim() : ""))
    .filter(Boolean)
}

function readMomentSourceDraftId(moment: KeptMomentSummary): string | null {
  const row = moment as MomentLineageFields
  const id = row.sourceDraftId ?? row.source_draft_id
  return typeof id === "string" && id.trim() ? id.trim() : null
}

async function loadDialogTitleById(domainId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/kip/dialogs`)
    const list = (res as { dialogs?: DialogListRow[] })?.dialogs
    if (!Array.isArray(list)) return map
    for (const dialog of list) {
      if (typeof dialog?.id === "string" && dialog.id.trim()) {
        const title =
          typeof dialog.title === "string" && dialog.title.trim()
            ? dialog.title.trim()
            : "Untitled dialog"
        map.set(dialog.id.trim(), title)
      }
    }
  } catch {
    // Titles fall back to "Untitled dialog" in groupRealmNavEntries
  }
  return map
}

/**
 * Resolve draft → dialog_id and moment → dialog via list fields (dialogId + pointIds).
 * Detail-fetch only for Moments whose sourceDraftId sits outside the nav list.
 */
function resolveDialogLineageFromList(drafts: KipDraftSummary[]): {
  draftDialogById: Map<string, string>
  pointDialogById: Map<string, string>
} {
  const draftDialogById = new Map<string, string>()
  const pointDialogById = new Map<string, string>()

  for (const summary of drafts) {
    const dialogId = readDraftDialogId(summary)
    if (!dialogId) continue
    draftDialogById.set(summary.id, dialogId)
    for (const pointId of readDraftPointIds(summary)) {
      pointDialogById.set(pointId, dialogId)
    }
  }

  return { draftDialogById, pointDialogById }
}

function resolveMomentDialogId(
  moment: KeptMomentSummary,
  draftDialogById: ReadonlyMap<string, string>,
  pointDialogById: ReadonlyMap<string, string>,
): string | null {
  const sourceDraftId = readMomentSourceDraftId(moment)
  if (sourceDraftId) {
    const viaDraft = draftDialogById.get(sourceDraftId)
    if (viaDraft) return viaDraft
  }
  // Identity keep: primary Moment.id === Point.id
  return pointDialogById.get(moment.id) ?? null
}

async function loadRealmNavGrowthPayload(
  domainId: string,
  domainSlug: string | null,
): Promise<RealmNavGrowthPayload> {
  const cacheKey = `${domainId}:${domainSlug ?? ""}`
  const existing = growthInflight.get(cacheKey)
  if (existing) return existing

  const promise = (async (): Promise<RealmNavGrowthPayload> => {
    const [drafts, libraryRows, keptMoments, dialogTitleById] = await Promise.all([
      KipApi.listDrafts(domainId, undefined, {
        limit: 40,
        excludeStatus: ["promoted", "archived"],
      }).catch(() => [] as KipDraftSummary[]),
      fetchDomainLibraryNavRows(domainId).catch(() => []),
      domainSlug
        ? getKeptMoments({ domainSlug, limit: 30 }).catch(() => [] as KeptMomentSummary[])
        : Promise.resolve([] as KeptMomentSummary[]),
      loadDialogTitleById(domainId),
    ])

    const { draftDialogById, pointDialogById } = resolveDialogLineageFromList(drafts)

    // Moments whose sourceDraftId points outside the nav list (e.g. promoted) need a one-off fetch.
    const missingSourceDraftIds = [
      ...new Set(
        keptMoments
          .map(readMomentSourceDraftId)
          .filter(
            (id): id is string =>
              typeof id === "string" && id.length > 0 && !draftDialogById.has(id),
          ),
      ),
    ]
    if (missingSourceDraftIds.length > 0) {
      const extras = await Promise.all(
        missingSourceDraftIds.map((id) => KipApi.getDraft(domainId, id).catch(() => null)),
      )
      for (const detail of extras) {
        const dialogId = readDraftDialogId(detail)
        if (detail && dialogId) {
          draftDialogById.set(detail.id, dialogId)
          for (const pointId of readDraftPointIds(detail)) {
            pointDialogById.set(pointId, dialogId)
          }
        }
      }
    }

    // document_manuscript is Dialog Document storage (Points) — Chronicle expands it.
    // Do not list it as a peer Draft row (that duplicated "Becoming Together" in Nav).
    const navDrafts = drafts.filter((draft) => draft.kind !== DOCUMENT_MANUSCRIPT_KIND)

    const entries: RealmNavEntry[] = [
      ...navDrafts.map((draft) =>
        draftToRealmNavEntry(draft, draftDialogById.get(draft.id) ?? null),
      ),
      ...libraryRows.map((row) => libraryRowToKeptNavEntry(row, null)),
      ...keptMoments.map((moment) =>
        momentToKeptNavEntry(
          moment,
          resolveMomentDialogId(moment, draftDialogById, pointDialogById),
        ),
      ),
      // Presented: library rows indexed for show — heuristic until Present surface wires status
      ...libraryRows.slice(0, 8).map((row) => libraryRowToPresentedNavEntry(row, null)),
    ]

    return { grouped: groupRealmNavEntries(entries, dialogTitleById) }
  })().finally(() => {
    growthInflight.delete(cacheKey)
  })

  growthInflight.set(cacheKey, promise)
  return promise
}

export function useRealmNavGrowth(
  domainId: string | null,
  domainSlug: string | null,
  enabled: boolean,
): RealmNavGrowthState {
  const [grouped, setGrouped] = React.useState<RealmNavGrouped>(() => emptyRealmNavGrouped())
  const [loading, setLoading] = React.useState(enabled)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)

  const refresh = React.useCallback(() => setTick((v) => v + 1), [])

  React.useEffect(() => {
    if (!enabled || !domainId) {
      setLoading(false)
      setGrouped(emptyRealmNavGrouped())
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const { grouped: next } = await loadRealmNavGrowthPayload(domainId, domainSlug)
        if (!cancelled) setGrouped(next)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load nav")
          setGrouped(emptyRealmNavGrouped())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [domainId, domainSlug, enabled, tick])

  return {
    loading,
    error,
    byStage: grouped.byStage,
    byDialog: grouped.byDialog,
    refresh,
  }
}
