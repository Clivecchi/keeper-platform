import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api'
import type { EngagementTemplateDefinition } from '../../components/engagement/EngagementForm'

export type KeeperTypeName = 'Journey' | 'Path' | 'Moment' | 'Domain' | string

interface UseKeeperTypeTemplatesOptions {
  keeperTypeName: KeeperTypeName
  enabled?: boolean
}

interface UseKeeperTypeTemplatesResult {
  templates: EngagementTemplateDefinition[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

export function useKeeperTypeTemplates({
  keeperTypeName,
  enabled = true,
}: UseKeeperTypeTemplatesOptions): UseKeeperTypeTemplatesResult {
  const [templates, setTemplates] = useState<EngagementTemplateDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!enabled || !keeperTypeName) {
      setTemplates([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiFetch(
        `/api/engagement/templates/type/${encodeURIComponent(keeperTypeName)}`,
      )

      if (response.success && Array.isArray(response.data)) {
        setTemplates(response.data)
        return
      }

      setTemplates([])
      setError('Failed to load engagement templates')
    } catch (loadError) {
      console.error('[useKeeperTypeTemplates] load failed:', loadError)
      setTemplates([])
      setError('Failed to load engagement templates')
    } finally {
      setIsLoading(false)
    }
  }, [enabled, keeperTypeName])

  useEffect(() => {
    void load()
  }, [load])

  return { templates, isLoading, error, reload: load }
}

export function filterEngagementTemplates(
  templates: EngagementTemplateDefinition[],
  options: {
    targetType?: string
    includeSlugs?: string[]
    excludeSlugs?: string[]
    isAuthenticated?: boolean
  },
): EngagementTemplateDefinition[] {
  const { targetType, includeSlugs, excludeSlugs, isAuthenticated = false } = options

  return templates.filter((template) => {
    if (includeSlugs?.length && !includeSlugs.includes(template.slug)) {
      return false
    }

    if (excludeSlugs?.includes(template.slug)) {
      return false
    }

    const visibility = template.config?.visibility ?? 'public'
    if (visibility === 'admin' || visibility === 'member') {
      if (!isAuthenticated) return false
    }

    if (targetType && template.targetType && template.targetType !== targetType) {
      return false
    }

    return true
  })
}
