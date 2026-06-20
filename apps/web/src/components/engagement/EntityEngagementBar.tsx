/**
 * EntityEngagementBar
 * Renders KeeperType-linked engagement templates for a story surface entity.
 */

import { useMemo } from 'react'
import { EngagementButton } from './EngagementButton'
import type { EngagementContext, EngagementTemplateDefinition } from './EngagementForm'
import {
  filterEngagementTemplates,
  useKeeperTypeTemplates,
  type KeeperTypeName,
} from '../../lib/engagement/useKeeperTypeTemplates'

export interface EntityEngagementBarProps {
  keeperTypeName: KeeperTypeName
  entityType: EngagementContext['entityType']
  entityId: string
  domainId: string
  keeperId?: string
  journeyId?: string
  targetType?: string
  includeSlugs?: string[]
  excludeSlugs?: string[]
  isAuthenticated?: boolean
  enabled?: boolean
  className?: string
  buttonClassName?: string
  onSuccess?: (slug: string, result: unknown) => void
  onActivate?: (template: EngagementTemplateDefinition, context: EngagementContext) => void
}

function buildEngagementContext(props: EntityEngagementBarProps): EngagementContext {
  return {
    entityType: props.entityType,
    entityId: props.entityId,
    domainId: props.domainId,
    keeperId: props.keeperId,
    journeyId: props.journeyId,
  }
}

export function EntityEngagementBar({
  keeperTypeName,
  entityType,
  entityId,
  domainId,
  keeperId,
  journeyId,
  targetType,
  includeSlugs,
  excludeSlugs,
  isAuthenticated = false,
  enabled = true,
  className = '',
  buttonClassName = '',
  onSuccess,
  onActivate,
}: EntityEngagementBarProps) {
  const { templates, isLoading } = useKeeperTypeTemplates({
    keeperTypeName,
    enabled: enabled && Boolean(entityId && domainId),
  })

  const visibleTemplates = useMemo(
    () =>
      filterEngagementTemplates(templates, {
        targetType: targetType ?? entityType,
        includeSlugs,
        excludeSlugs,
        isAuthenticated,
      }),
    [templates, targetType, entityType, includeSlugs, excludeSlugs, isAuthenticated],
  )

  if (!enabled || !entityId || !domainId || isLoading || visibleTemplates.length === 0) {
    return null
  }

  const context = buildEngagementContext({
    keeperTypeName,
    entityType,
    entityId,
    domainId,
    keeperId,
    journeyId,
  })

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {visibleTemplates.map((template) => (
        <EngagementButton
          key={template.slug}
          templateSlug={template.slug}
          context={context}
          label={template.label}
          variant="secondary"
          className={buttonClassName || '!bg-transparent !hover:bg-transparent rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80 text-inherit'}
          onActivate={onActivate}
          onSuccess={(result) => onSuccess?.(template.slug, result)}
        />
      ))}
    </div>
  )
}

export default EntityEngagementBar
