"use client"

import * as React from "react"
import { ChronicleActPresence } from "../../presence/chronicleConfig/ChronicleActPresence"
import { useBoardEngagement } from "./useBoardEngagement"
import type { BoardEngagementIntent } from "./useBoardEngagement"
import { resolveCreatedEntityId } from "./engagementResultUtils"
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
    (result) => {
      onSuccess?.()
      const slug = intent.template.slug
      if (slug.startsWith("draft.")) {
        boardCtx?.actions.bumpDraftNav()
        const draftId = resolveCreatedEntityId(result?.data, "draft")
        if (draftId) {
          boardCtx?.actions.onDraftSelect(draftId)
        }
      } else if (slug === "journey.create") {
        boardCtx?.actions.bumpJourneyNav()
        const journeyId = resolveCreatedEntityId(result?.data, "journey")
        if (journeyId) {
          boardCtx?.actions.onJourneySelect(journeyId)
        }
      } else if (slug === "journey.addMoment") {
        boardCtx?.actions.bumpJourneyNav()
        const momentId = resolveCreatedEntityId(result?.data, "moment")
        if (momentId) {
          boardCtx?.actions.onMomentSelect(momentId)
        }
      } else if (slug.startsWith("path.")) {
        boardCtx?.actions.bumpJourneyNav()
        const pathId = resolveCreatedEntityId(result?.data, "path")
        if (pathId) {
          boardCtx?.actions.onPathSelect(pathId)
        }
      } else if (slug.startsWith("moment.")) {
        boardCtx?.actions.bumpJourneyNav()
        const momentId = resolveCreatedEntityId(result?.data, "moment")
        if (momentId) {
          boardCtx?.actions.onMomentSelect(momentId)
        }
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
