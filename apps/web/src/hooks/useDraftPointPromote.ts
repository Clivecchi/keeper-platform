"use client"

import * as React from "react"
import type { DraftPoint } from "@keeper/shared"
import { KipApi } from "../lib/kipApi"

export interface UseDraftPointPromoteOptions {
  domainId: string | null | undefined
  journeyId: string | null | undefined
  /** Fallback when Nav has no selected Journey — e.g. draft spec `targetJourneyId`. */
  resolveJourneyId?: () => string | null | undefined
  onDraftSelect?: (draftId: string) => void
  bumpDraftPresence?: () => void
  bumpDraftNav?: () => void
  onJourneyRefresh?: () => void
  setError?: (message: string | null) => void
}

export interface UseDraftPointPromoteResult {
  promotingDraftPointId: string | null
  promotedDraftPointIds: Set<string>
  promoteDraftPoint: (draftId: string, pointId: string) => void
}

const MISSING_JOURNEY_PROMOTE_MESSAGE =
  "Select a Journey in Nav or set targetJourneyId on the draft before promoting."

export function useDraftPointPromote({
  domainId,
  journeyId,
  resolveJourneyId,
  onDraftSelect,
  bumpDraftPresence,
  bumpDraftNav,
  onJourneyRefresh,
  setError,
}: UseDraftPointPromoteOptions): UseDraftPointPromoteResult {
  const [promotedDraftPointIds, setPromotedDraftPointIds] = React.useState<Set<string>>(
    () => new Set(),
  )
  const [promotingDraftPointId, setPromotingDraftPointId] = React.useState<string | null>(null)

  const promoteDraftPoint = React.useCallback(
    (draftId: string, pointId: string) => {
      if (!domainId) return
      const resolvedJourneyId = journeyId ?? resolveJourneyId?.() ?? null
      if (!resolvedJourneyId) {
        setError?.(MISSING_JOURNEY_PROMOTE_MESSAGE)
        return
      }
      setPromotingDraftPointId(pointId)
      setError?.(null)
      void KipApi.promoteDraftPoint(domainId, draftId, pointId, { journeyId: resolvedJourneyId })
        .then(() => {
          setPromotedDraftPointIds((prev) => new Set(prev).add(pointId))
          onDraftSelect?.(draftId)
          bumpDraftPresence?.()
          bumpDraftNav?.()
          onJourneyRefresh?.()
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Failed to promote draft point"
          setError?.(message)
        })
        .finally(() => {
          setPromotingDraftPointId(null)
        })
    },
    [
      domainId,
      journeyId,
      resolveJourneyId,
      onDraftSelect,
      bumpDraftPresence,
      bumpDraftNav,
      onJourneyRefresh,
      setError,
    ],
  )

  return {
    promotingDraftPointId,
    promotedDraftPointIds,
    promoteDraftPoint,
  }
}
