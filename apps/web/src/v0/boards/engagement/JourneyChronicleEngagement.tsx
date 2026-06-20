"use client"

import { EntityEngagementBar } from "../../../components/engagement/EntityEngagementBar"
import { BoardEngagementForm } from "./BoardEngagementForm"
import type { UseBoardEngagementResult } from "./useBoardEngagement"

export interface JourneyChronicleEngagementProps {
  engagement: UseBoardEngagementResult
  journeyId: string
  domainId: string
  keeperId?: string
  isAuthenticated?: boolean
}

export function JourneyChronicleEngagement({
  engagement,
  journeyId,
  domainId,
  keeperId,
  isAuthenticated = true,
}: JourneyChronicleEngagementProps) {
  const { intent, activateTemplate, notifySuccess } = engagement

  if (!isAuthenticated || !domainId || !journeyId) return null

  if (intent) {
    return <BoardEngagementForm engagement={engagement} className="mt-3" />
  }

  const buttonClassName =
    "!bg-transparent !hover:bg-transparent rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-80 text-inherit"

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <EntityEngagementBar
        keeperTypeName="Journey"
        entityType="journey"
        entityId={journeyId}
        domainId={domainId}
        keeperId={keeperId}
        journeyId={journeyId}
        targetType="journey"
        includeSlugs={["journey.addMoment"]}
        isAuthenticated={isAuthenticated}
        onActivate={activateTemplate}
        onSuccess={notifySuccess}
        buttonClassName={buttonClassName}
      />
      <EntityEngagementBar
        keeperTypeName="Path"
        entityType="journey"
        entityId={journeyId}
        domainId={domainId}
        keeperId={keeperId}
        journeyId={journeyId}
        targetType="journey"
        includeSlugs={["path.create"]}
        isAuthenticated={isAuthenticated}
        onActivate={activateTemplate}
        onSuccess={notifySuccess}
        buttonClassName={buttonClassName}
      />
      <EntityEngagementBar
        keeperTypeName="Moment"
        entityType="journey"
        entityId={journeyId}
        domainId={domainId}
        keeperId={keeperId}
        journeyId={journeyId}
        targetType="journey"
        includeSlugs={["moment.create"]}
        isAuthenticated={isAuthenticated}
        onActivate={activateTemplate}
        onSuccess={notifySuccess}
        buttonClassName={buttonClassName}
      />
    </div>
  )
}
