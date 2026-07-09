"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
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

function resolveAgentRole(data: unknown): string | null {
  if (!data || typeof data !== "object") return null

  const record = data as Record<string, unknown>
  const wrapped = record.data
  if (
    wrapped &&
    typeof wrapped === "object" &&
    typeof (wrapped as { role?: unknown }).role === "string"
  ) {
    return (wrapped as { role: string }).role
  }

  if (typeof record.role === "string") return record.role
  return null
}

async function assignDomainLeadAgent(domainId: string, agentId: string): Promise<void> {
  await apiFetch(`/api/domains/${encodeURIComponent(domainId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      settings: { primaryAgentId: agentId },
    }),
  })
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
      void (async () => {
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
        } else if (slug === "keeper.create") {
          boardCtx?.actions.bumpKeeperNav()
          const keeperId = resolveCreatedEntityId(result?.data, "keeper")
          if (keeperId) {
            boardCtx?.actions.onKeeperSelect(keeperId)
          }
        } else if (slug === "dialog.create") {
          boardCtx?.actions.bumpDialogNav()
          const dialogId = resolveCreatedEntityId(result?.data, "dialog")
          if (dialogId) {
            boardCtx?.actions.onDialogSelect(dialogId)
          }
        } else if (slug === "agent.create") {
          const agentId = resolveCreatedEntityId(result?.data, "agent")
          const domainId = intent.context.domainId
          const role = resolveAgentRole(result?.data)

          if (agentId && domainId && role === "Lead") {
            try {
              await assignDomainLeadAgent(domainId, agentId)
            } catch (error) {
              console.error(
                "[ChronicleEngagementSurface] Failed to assign domain lead agent:",
                error,
              )
            }
          }

          boardCtx?.actions.bumpAgentNav()
          if (agentId) {
            boardCtx?.actions.onAgentSelect(agentId)
          }
        }
        onClose()
      })()
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
      onClose={onClose}
      submitting={engagement.submitting}
      errorMessage={errorMessage}
    />
  )
}
