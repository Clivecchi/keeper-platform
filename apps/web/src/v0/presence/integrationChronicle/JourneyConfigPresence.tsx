"use client"

import * as React from "react"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"

export type JourneyMetadataFields = {
  name: string
  forward: string
}

const INPUT_CLASS =
  "w-full rounded-md border px-3 py-2 text-[13px] bg-transparent outline-none resize-y"

const INPUT_STYLE = {
  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
} as const

export function JourneyConfigPresence({
  journeyId,
  domainId,
  name,
  forward,
  onBack,
  onRefresh,
  onLabelResolved,
}: {
  journeyId: string
  domainId: string
  name: string
  forward?: string | null
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
}) {
  const board = useUniversalBoardOptional()

  const baselineRef = React.useRef<JourneyMetadataFields>({
    name: name.trim(),
    forward: forward?.trim() ?? "",
  })
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    const next = { name: name.trim(), forward: forward?.trim() ?? "" }
    baselineRef.current = next
    setFieldValues(next)
  }, [name, forward, journeyId])

  const chronicleConfig = useChronicleConfig({
    entityKind: "journey",
    entityId: journeyId,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      const patch: Record<string, string> = {}
      if (current.name.trim() !== baseline.name.trim()) {
        patch.name = current.name.trim()
      }
      if (current.forward !== baseline.forward) {
        patch.forward = current.forward
      }
      if (Object.keys(patch).length === 0) return null
      return patch
    },
    validate: () => {
      if (fieldValuesRef.current.name.trim().length < 2) {
        return "Journey name is required."
      }
      return null
    },
    onSaved: (field, value) => {
      if (typeof value !== "string") return
      baselineRef.current = { ...baselineRef.current, [field]: value }
      if (field === "name") {
        onLabelResolved?.(value)
        board?.actions.bumpJourneyNav()
      }
    },
    onRefresh,
  })

  const handleFieldChange = (key: keyof JourneyMetadataFields, value: string) => {
    chronicleConfig.markEdited()
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.name || name,
        avatar: "🧭",
        status: "Journey",
      }}
      onBack={onBack}
      saveStatus={chronicleConfig.saveStatus}
      saveMessage={chronicleConfig.saveMessage}
      isDirty={chronicleConfig.isDirty}
      onSave={() => void chronicleConfig.handleSave()}
      onDismissError={chronicleConfig.dismissSaveError}
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="keeper-presence-field-label mb-1.5">Journey name</p>
          <input
            value={fieldValues.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <p className="keeper-presence-field-label mb-1.5">Forward</p>
          <textarea
            value={fieldValues.forward}
            onChange={(e) => handleFieldChange("forward", e.target.value)}
            rows={5}
            className={INPUT_CLASS}
            style={{ ...INPUT_STYLE, minHeight: "7rem" }}
            placeholder="What is this journey for?"
          />
        </div>
      </div>
    </ChronicleConfigShell>
  )
}
