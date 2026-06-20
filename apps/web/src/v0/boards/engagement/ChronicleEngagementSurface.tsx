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

export function ChronicleEngagementSurface({
  intent,
  onClose,
  onSuccess,
}: ChronicleEngagementSurfaceProps) {
  const boardCtx = useUniversalBoardOptional()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const engagement = useBoardEngagement(
    () => {
      onSuccess?.()
      boardCtx?.actions.bumpJourneyNav()
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
