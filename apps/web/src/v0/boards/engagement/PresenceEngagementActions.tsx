"use client"

import { EntityEngagementBar } from "../../../components/engagement/EntityEngagementBar"
import type { EngagementContext } from "../../../components/engagement/EngagementForm"
import {
  useKeeperTypeTemplates,
  type KeeperTypeName,
} from "../../../lib/engagement/useKeeperTypeTemplates"
import { BoardEngagementForm } from "./BoardEngagementForm"
import type { UseBoardEngagementResult } from "./useBoardEngagement"

export interface PresenceEngagementActionsProps {
  engagement: UseBoardEngagementResult
  keeperTypeName: KeeperTypeName
  entityType: EngagementContext["entityType"]
  entityId: string
  domainId: string
  keeperId?: string
  journeyId?: string
  targetType?: string
  includeSlugs?: string[]
  isAuthenticated?: boolean
  className?: string
}

export function PresenceEngagementActions({
  engagement,
  keeperTypeName,
  entityType,
  entityId,
  domainId,
  keeperId,
  journeyId,
  targetType,
  includeSlugs,
  isAuthenticated = true,
  className = "",
}: PresenceEngagementActionsProps) {
  const { intent, activateTemplate } = engagement
  const { isLoading } = useKeeperTypeTemplates({
    keeperTypeName,
    enabled: Boolean(entityId && domainId && isAuthenticated),
  })

  if (!isAuthenticated || !entityId || !domainId) return null

  if (intent) {
    return <BoardEngagementForm engagement={engagement} className={className} />
  }

  if (isLoading) return null

  return (
    <EntityEngagementBar
      keeperTypeName={keeperTypeName}
      entityType={entityType}
      entityId={entityId}
      domainId={domainId}
      keeperId={keeperId}
      journeyId={journeyId}
      targetType={targetType}
      includeSlugs={includeSlugs}
      isAuthenticated={isAuthenticated}
      onActivate={activateTemplate}
      onSuccess={engagement.notifySuccess}
      className={className}
      buttonClassName="!bg-transparent !hover:bg-transparent rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-80 text-inherit"
    />
  )
}
