"use client"

import * as React from "react"
import type { AIModelFeedData } from "./feeds/AIModelFeed"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"
import { FeedShimmer, type IntegrationType } from "./shared"
import type { FeedDataState } from "./serviceConfig"
import {
  IntegrationAIModelConfigBlocks,
  integrationKeyStatusLabel,
} from "./declarationChronicle"

export type IntegrationMetadataFields = {
  display_label: string
  description: string
  connect_copy: string
}

function toMetadataFields(
  displayLabel: string,
  description?: string | null,
  connectCopy?: string | null,
): IntegrationMetadataFields {
  return {
    display_label: displayLabel,
    description: description ?? "",
    connect_copy: connectCopy ?? "",
  }
}

export function IntegrationConfigPresence({
  serviceSlug,
  domainId,
  displayLabel,
  integrationType,
  description,
  connectCopy,
  feed,
  onBack,
  onRefresh,
  onLabelResolved,
}: {
  serviceSlug: string
  domainId: string
  displayLabel: string
  integrationType: IntegrationType
  description?: string | null
  connectCopy?: string | null
  feed: FeedDataState<unknown>
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
}) {
  const d = feed.data as AIModelFeedData
  const statusLabel = integrationKeyStatusLabel(d.keyHealth?.status, integrationType)

  const baselineRef = React.useRef(
    toMetadataFields(displayLabel, description, connectCopy),
  )
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    const next = toMetadataFields(displayLabel, description, connectCopy)
    baselineRef.current = next
    setFieldValues(next)
  }, [serviceSlug, displayLabel, description, connectCopy])

  const chronicleConfig = useChronicleConfig({
    entityKind: "service",
    entityId: serviceSlug,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      const patch: Record<string, string> = {}
      if (current.display_label.trim() !== baseline.display_label.trim()) {
        patch.display_label = current.display_label.trim()
      }
      if (current.description !== baseline.description) {
        patch.description = current.description
      }
      if (current.connect_copy !== baseline.connect_copy) {
        patch.connect_copy = current.connect_copy
      }
      if (Object.keys(patch).length === 0) return null
      return patch
    },
    validate: () => {
      if (fieldValuesRef.current.display_label.trim().length === 0) {
        return "Display label is required."
      }
      return null
    },
    onSaved: (field, value) => {
      if (typeof value !== "string") return
      baselineRef.current = { ...baselineRef.current, [field]: value }
      if (field === "display_label") {
        onLabelResolved?.(value)
      }
    },
    onRefresh,
  })

  const handleFieldChange = React.useCallback(
    (key: keyof IntegrationMetadataFields, value: string) => {
      chronicleConfig.markEdited()
      setFieldValues((prev) => ({ ...prev, [key]: value }))
    },
    [chronicleConfig],
  )

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.display_label || displayLabel,
        status: statusLabel,
      }}
      onBack={onBack}
      saveStatus={chronicleConfig.saveStatus}
      saveMessage={chronicleConfig.saveMessage}
      isDirty={chronicleConfig.isDirty}
      onSave={() => void chronicleConfig.handleSave()}
      onDismissError={chronicleConfig.dismissSaveError}
    >
      <div className="mb-4">
        <p className="keeper-presence-field-label mb-1.5">Display label</p>
        <input
          type="text"
          value={fieldValues.display_label}
          onChange={(e) => handleFieldChange("display_label", e.target.value)}
          placeholder="Integration name in Chronicle"
          className="w-full rounded-md border px-3 py-2 text-[14px] bg-transparent outline-none"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            color: "hsl(var(--theme-ink-primary))",
          }}
        />
        {chronicleConfig.fieldErrors.display_label ? (
          <p
            className="text-[13px] mt-2 leading-relaxed"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            {chronicleConfig.fieldErrors.display_label}
          </p>
        ) : null}
      </div>

      <div className="mb-4">
        <p className="keeper-presence-field-label mb-1.5">Description</p>
        <textarea
          value={fieldValues.description}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          rows={3}
          placeholder="What this integration does in Chronicle"
          className="w-full resize-y rounded-md border px-3 py-2.5 text-[14px] leading-relaxed bg-transparent outline-none"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            color: "hsl(var(--theme-ink-primary))",
            minHeight: "4.5rem",
          }}
        />
      </div>

      <div className="mb-6">
        <p className="keeper-presence-field-label mb-1.5">Connect copy</p>
        <textarea
          value={fieldValues.connect_copy}
          onChange={(e) => handleFieldChange("connect_copy", e.target.value)}
          rows={2}
          placeholder="Message shown before connect"
          className="w-full resize-y rounded-md border px-3 py-2.5 text-[14px] leading-relaxed bg-transparent outline-none"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            color: "hsl(var(--theme-ink-secondary))",
            minHeight: "3.5rem",
          }}
        />
      </div>

      {feed.loading && !d.keyHealth ? (
        <FeedShimmer rows={4} />
      ) : (
        <IntegrationAIModelConfigBlocks feed={feed} />
      )}
    </ChronicleConfigShell>
  )
}
