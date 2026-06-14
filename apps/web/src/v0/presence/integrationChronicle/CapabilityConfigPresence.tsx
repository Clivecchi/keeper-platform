"use client"

import * as React from "react"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import type { CapabilityDto } from "./feeds/CapabilityFeed"
import type { CapabilityKind } from "./capabilityNavUtils"

export type CapabilityMetadataFields = {
  display_label: string
  description: string
}

function toMetadataFields(
  displayLabel: string,
  description?: string | null,
): CapabilityMetadataFields {
  return {
    display_label: displayLabel,
    description: description ?? "",
  }
}

export function CapabilityConfigPresence({
  capabilityId,
  domainId,
  displayLabel,
  description,
  capability,
  onBack,
  onRefresh,
  onLabelResolved,
}: {
  capabilityId: string
  domainId: string
  displayLabel: string
  description?: string | null
  capability: CapabilityDto
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
}) {
  const board = useUniversalBoardOptional()

  const baselineRef = React.useRef(toMetadataFields(displayLabel, description))
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    const next = toMetadataFields(displayLabel, description)
    baselineRef.current = next
    setFieldValues(next)
  }, [capabilityId, displayLabel, description])

  const chronicleConfig = useChronicleConfig({
    entityKind: "capability",
    entityId: capabilityId,
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
      board?.actions.bumpCapabilityNav({
        capabilityId,
        ...(field === "display_label" ? { display_label: value } : {}),
        ...(field === "description" ? { description: value } : {}),
      })
    },
    onRefresh,
  })

  const handleFieldChange = React.useCallback(
    (fieldKey: keyof CapabilityMetadataFields, value: string) => {
      chronicleConfig.markEdited()
      setFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
    },
    [chronicleConfig],
  )

  const inputStyle: React.CSSProperties = {
    borderColor: "hsl(var(--theme-border-soft) / 0.5)",
    background: "hsl(var(--theme-surface-panel) / 0.35)",
    color: "hsl(var(--theme-ink-primary))",
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.display_label || capability.slug,
        status: capability.kind,
      }}
      onBack={onBack}
      saveStatus={chronicleConfig.saveStatus}
      saveMessage={chronicleConfig.saveMessage}
      isDirty={chronicleConfig.isDirty}
      onSave={() => void chronicleConfig.handleSave()}
      onDismissError={chronicleConfig.dismissSaveError}
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        <div>
          <label
            className="text-[10px] font-mono uppercase tracking-wider block mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Slug (read-only)
          </label>
          <input
            readOnly
            value={capability.slug}
            className="w-full rounded-md border px-3 py-2 text-[13px] font-mono opacity-70"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="text-[10px] font-mono uppercase tracking-wider block mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Kind (read-only)
          </label>
          <input
            readOnly
            value={capability.kind}
            className="w-full rounded-md border px-3 py-2 text-[13px] capitalize opacity-70"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="text-[10px] font-mono uppercase tracking-wider block mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Display label
          </label>
          <input
            value={fieldValues.display_label}
            onChange={(e) => handleFieldChange("display_label", e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="text-[10px] font-mono uppercase tracking-wider block mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Description
          </label>
          <textarea
            value={fieldValues.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-[13px] resize-y"
            style={inputStyle}
          />
        </div>
        <p className="text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Enforcement kind: {(capability.kind as CapabilityKind) === "infra"
            ? "Enforced via requireCapability"
            : "Display only in Pass 1"}
        </p>
      </div>
    </ChronicleConfigShell>
  )
}
