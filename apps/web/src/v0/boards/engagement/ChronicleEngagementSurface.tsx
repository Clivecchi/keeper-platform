"use client"

import * as React from "react"
import { ChronicleActPresence } from "../../presence/chronicleConfig/ChronicleActPresence"
import { useBoardEngagement } from "./useBoardEngagement"
import type { BoardEngagementIntent } from "./useBoardEngagement"
import { useUniversalBoardOptional } from "../UniversalBoardContext"

export interface ChronicleEngagementSurfaceProps {
  intent: BoardEngagementIntent
  onClose: () => void
  onSuccess?: () => void
}

function resolveCreatedDraftId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const draft = (data as { draft?: { id?: unknown } }).draft
  return typeof draft?.id === "string" ? draft.id : null
}

export function ChronicleEngagementSurface({
  intent,
  onClose,
  onSuccess,
}: ChronicleEngagementSurfaceProps) {
  const boardCtx = useUniversalBoardOptional()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const engagement = useBoardEngagement(
    (result) => {
      onSuccess?.()
      const slug = intent.template.slug
      if (slug.startsWith("draft.")) {
        boardCtx?.actions.bumpDraftNav()
        const draftId = resolveCreatedDraftId(result?.data)
        if (draftId) {
          boardCtx?.actions.onDraftSelect(draftId)
        }
      } else if (
        slug.startsWith("journey.") ||
        slug.startsWith("path.") ||
        slug.startsWith("moment.")
      ) {
        boardCtx?.actions.bumpJourneyNav()
      }
      onClose()
    },
    intent,
  )

  const handleSubmit = React.useCallback(
    async (inputs: Record<string, unknown>) => {
      setErrorMessage(null)
      try {
        await engagement.handleSubmit(inputs)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Action failed",
        )
      }
    },
    [engagement],
  )

  return (
    <ChronicleActPresence
      template={intent.template}
      context={intent.context}
      onSubmit={handleSubmit}
      onClose={() => {
        engagement.cancel()
        onClose()
      }}
      submitting={engagement.submitting}
      errorMessage={errorMessage}
    />
  )
}
