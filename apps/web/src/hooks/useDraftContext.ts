"use client"

import * as React from "react"
import { KipApi } from "../lib/kipApi"
import type { KipDraft, KipSession } from "../lib/kipApi"
import { normalizeActionReceipt } from "../components/agent/types"

function pickSessionIdForDraft(sessions: KipSession[], draftId: string): string | null {
  const withDraft = sessions.filter((s) => (s.active_draft_id || s.activeDraftId) === draftId)
  if (!withDraft.length) return null
  withDraft.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
  return withDraft[0].id
}

export interface UseDraftContextOptions {
  selectedDraftId: string | null | undefined
  domainId: string | null | undefined
  agentId: string | null | undefined
  activeSessionId: string | null | undefined
  onActiveSessionIdChange?: (id: string | null) => void
  /** Agent board: refresh draft list after successful draft mutations in runAgent response */
  onRefreshDraftList?: () => void | Promise<void>
}

export interface UseDraftContextResult {
  /** Reserved for future use — conversation panels do not load full draft documents */
  draftDetail: KipDraft | null
  draftSession: string | null
  isLoadingDraft: boolean
  /** After `runAgent`, pass the result to refresh parent draft list when actions mutate drafts (Agent board) */
  refreshDraftsAfterRun: (result: unknown) => Promise<void>
}

/**
 * Draft–session linking (IDE) and post-run draft list refresh (Agent).
 */
export function useDraftContext({
  selectedDraftId,
  domainId,
  agentId,
  activeSessionId,
  onActiveSessionIdChange,
  onRefreshDraftList,
}: UseDraftContextOptions): UseDraftContextResult {
  React.useEffect(() => {
    if (!selectedDraftId || !agentId || !domainId || !onActiveSessionIdChange) return

    let cancelled = false
    void (async () => {
      try {
        const sessions = await KipApi.getSessionsByAgentId(agentId, { pageSize: 100 })
        if (cancelled) return
        const match = pickSessionIdForDraft(sessions, selectedDraftId)
        if (match) {
          onActiveSessionIdChange(match)
          return
        }
        if (activeSessionId) {
          try {
            await KipApi.setActiveDraft(domainId, activeSessionId, selectedDraftId)
          } catch {
            /* best-effort link */
          }
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedDraftId, agentId, domainId, onActiveSessionIdChange, activeSessionId])

  const refreshDraftsAfterRun = React.useCallback(
    async (result: unknown) => {
      if (!onRefreshDraftList) return
      const actionResults = (result as { data?: { actions?: unknown[] } })?.data?.actions
      if (!Array.isArray(actionResults) || actionResults.length === 0) return
      const hasDraftMutation = actionResults.some((ar: unknown) => {
        const n = normalizeActionReceipt(
          ar as Parameters<typeof normalizeActionReceipt>[0],
        )
        return (
          n.status === "success"
          && ["draft.create", "draft.update", "draft.delete", "draft.setActive"].includes(n.type)
        )
      })
      if (hasDraftMutation) await onRefreshDraftList()
    },
    [onRefreshDraftList],
  )

  return {
    draftDetail: null,
    draftSession: null,
    isLoadingDraft: false,
    refreshDraftsAfterRun,
  }
}
