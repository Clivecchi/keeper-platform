"use client"

import * as React from "react"
import { KipApi, type KipDraft, type KipDraftSummary } from "../../lib/kipApi"
import { apiFetch } from "../../lib/apiFetch"
import { getKeptMoments, type KeptMomentSummary } from "../api/v0Moments"
import { fetchDomainLibraryNavRows } from "../presence/integrationChronicle/libraryNavUtils"
import {
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
 * Resolve draft → dialog_id (detail fetch when list omits it) and
 * moment → dialog via sourceDraftId → draft.dialog_id, or Point-id identity keep.
 */
async function resolveDialogLineage(
  domainId: string,
  drafts: KipDraftSummary[],
): Promise<{
  draftDialogById: Map<string, string>
  pointDialogById: Map<string, string>
}> {
  const draftDialogById = new Map<string, string>()
  const pointDialogById = new Map<string, string>()

  const details = await Promise.all(
    drafts.map(async (summary) => {
      const fromList = readDraftDialogId(summary)
      if (fromList) {
        draftDialogById.set(summary.id, fromList)
      }
      try {
        return await KipApi.getDraft(domainId, summary.id)
      } catch {
        return null
      }
    }),
  )

  for (const detail of details) {
    if (!detail) continue
    const dialogId = readDraftDialogId(detail)
    if (dialogId) {
      draftDialogById.set(detail.id, dialogId)
      const points = detail.spec?.points
      if (Array.isArray(points)) {
        for (const point of points) {
          if (typeof point?.id === "string" && point.id.trim()) {
            pointDialogById.set(point.id.trim(), dialogId)
          }
        }
      }
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

        if (cancelled) return

        // List endpoint omits dialog_id — detail fetch supplies it + Point ids for Moment lineage.
        const { draftDialogById, pointDialogById } = await resolveDialogLineage(domainId, drafts)

        // Moments whose sourceDraftId points outside the nav list (e.g. promoted) need a one-off fetch.
        const missingSourceDraftIds = [
          ...new Set(
            keptMoments
              .map(readMomentSourceDraftId)
              .filter((id): id is string => Boolean(id) && !draftDialogById.has(id)),
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
              for (const point of detail.spec?.points ?? []) {
                if (typeof point?.id === "string" && point.id.trim()) {
                  pointDialogById.set(point.id.trim(), dialogId)
                }
              }
            }
          }
        }

        if (cancelled) return

        const entries: RealmNavEntry[] = [
          ...drafts.map((draft) =>
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

        setGrouped(groupRealmNavEntries(entries, dialogTitleById))
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
