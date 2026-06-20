import { useCallback, useState } from "react"
import { apiFetch } from "../../../lib/api"
import type {
  EngagementContext,
  EngagementTemplateDefinition,
} from "../../../components/engagement/EngagementForm"

export interface BoardEngagementIntent {
  template: EngagementTemplateDefinition
  context: EngagementContext
}

export interface UseBoardEngagementResult {
  intent: BoardEngagementIntent | null
  submitting: boolean
  activateTemplate: (
    template: EngagementTemplateDefinition,
    context: EngagementContext,
  ) => void
  activateBySlug: (slug: string, context: EngagementContext) => Promise<void>
  cancel: () => void
  handleSubmit: (inputs: Record<string, unknown>) => Promise<void>
  notifySuccess: () => void
}

export function useBoardEngagement(
  onSuccess?: () => void,
  initialIntent: BoardEngagementIntent | null = null,
): UseBoardEngagementResult {
  const [intent, setIntent] = useState<BoardEngagementIntent | null>(initialIntent)
  const [submitting, setSubmitting] = useState(false)

  const activateTemplate = useCallback(
    (template: EngagementTemplateDefinition, context: EngagementContext) => {
      setIntent({ template, context })
    },
    [],
  )

  const activateBySlug = useCallback(
    async (slug: string, context: EngagementContext) => {
      const response = await apiFetch(
        `/api/engagement/templates/${encodeURIComponent(slug)}`,
      )
      if (response.success && response.data) {
        setIntent({ template: response.data, context })
      }
    },
    [],
  )

  const cancel = useCallback(() => {
    setIntent(null)
    setSubmitting(false)
  }, [])

  const handleSubmit = useCallback(
    async (inputs: Record<string, unknown>) => {
      if (!intent) return
      setSubmitting(true)
      try {
        const response = await apiFetch("/api/engagement/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateSlug: intent.template.slug,
            context: intent.context,
            inputs,
          }),
        })
        if (!response.success) {
          throw new Error(response.message || response.error || "Action failed")
        }
        setIntent(null)
        onSuccess?.()
      } catch (error) {
        console.error("[useBoardEngagement] submit failed:", error)
        throw error
      } finally {
        setSubmitting(false)
      }
    },
    [intent, onSuccess],
  )

  const notifySuccess = useCallback(() => {
    onSuccess?.()
  }, [onSuccess])

  return {
    intent,
    submitting,
    activateTemplate,
    activateBySlug,
    cancel,
    handleSubmit,
    notifySuccess,
  }
}
