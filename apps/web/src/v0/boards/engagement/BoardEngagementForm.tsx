"use client"

import { EngagementForm } from "../../../components/engagement/EngagementForm"
import type { UseBoardEngagementResult } from "./useBoardEngagement"

export interface BoardEngagementFormProps {
  engagement: Pick<
    UseBoardEngagementResult,
    "intent" | "submitting" | "cancel" | "handleSubmit"
  >
  className?: string
}

export function BoardEngagementForm({
  engagement,
  className = "",
}: BoardEngagementFormProps) {
  const { intent, submitting, cancel, handleSubmit } = engagement

  if (!intent) return null

  return (
    <div
      className={`rounded-xl border p-3 ${className}`}
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.35)",
        backgroundColor: "hsl(var(--theme-surface-paper) / 0.5)",
      }}
    >
      <EngagementForm
        template={intent.template}
        context={intent.context}
        onSubmit={handleSubmit}
        onCancel={cancel}
        isLoading={submitting}
        title=""
      />
    </div>
  )
}
