"use client"

import * as React from "react"
import type { DraftPoint } from "@keeper/shared"
import { KipApi } from "../lib/kipApi"
import { patchAcceptedDraftPointInMessages } from "../components/agent/helpers"
import type { AgentDialogueMessage } from "../components/agent/types"

export interface UseDraftPointAcceptOptions {
  domainId: string | null | undefined
  onDraftListRefresh?: () => void
  onDraftSelect?: (draftId: string) => void
  bumpDraftPresence?: () => void
  bumpDraftNav?: () => void
  setMessages?: React.Dispatch<React.SetStateAction<AgentDialogueMessage[]>>
  setError?: (message: string | null) => void
}

export interface UseDraftPointAcceptResult {
  acceptedDraftPointIds: Set<string>
  acceptingDraftPointId: string | null
  acceptDraftPoint: (draftId: string, pointId: string) => void
}

export function useDraftPointAccept({
  domainId,
  onDraftListRefresh,
  onDraftSelect,
  bumpDraftPresence,
  bumpDraftNav,
  setMessages,
  setError,
}: UseDraftPointAcceptOptions): UseDraftPointAcceptResult {
  const [acceptedDraftPointIds, setAcceptedDraftPointIds] = React.useState<Set<string>>(
    () => new Set(),
  )
  const [acceptingDraftPointId, setAcceptingDraftPointId] = React.useState<string | null>(null)

  const acceptDraftPoint = React.useCallback(
    (draftId: string, pointId: string) => {
      if (!domainId) return
      setAcceptingDraftPointId(pointId)
      setError?.(null)
      void KipApi.acceptDraftPoint(domainId, draftId, pointId)
        .then((res) => {
          const updatedPoint = res.result?.data?.point as DraftPoint | undefined
          setAcceptedDraftPointIds((prev) => new Set(prev).add(pointId))
          if (setMessages) {
            setMessages((prev) =>
              patchAcceptedDraftPointInMessages(prev, draftId, pointId, updatedPoint),
            )
          }
          onDraftListRefresh?.()
          onDraftSelect?.(draftId)
          bumpDraftPresence?.()
          bumpDraftNav?.()
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Failed to accept draft point"
          setError?.(message)
        })
        .finally(() => {
          setAcceptingDraftPointId(null)
        })
    },
    [
      domainId,
      onDraftListRefresh,
      onDraftSelect,
      bumpDraftPresence,
      bumpDraftNav,
      setMessages,
      setError,
    ],
  )

  return {
    acceptedDraftPointIds,
    acceptingDraftPointId,
    acceptDraftPoint,
  }
}
