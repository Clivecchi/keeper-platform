"use client"

import * as React from "react"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"

export type PathMetadataFields = {
  name: string
  prelude: string
}

const INPUT_CLASS =
  "w-full rounded-md border px-3 py-2 text-[13px] bg-transparent outline-none resize-y"

const INPUT_STYLE = {
  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
} as const

export function PathConfigPresence({
  pathId,
  domainId,
  name,
  prelude,
  onBack,
  onRefresh,
  onLabelResolved,
}: {
  pathId: string
  domainId: string
  name: string
  prelude?: string | null
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
}) {
  const baselineRef = React.useRef<PathMetadataFields>({
    name: name.trim(),
    prelude: prelude?.trim() ?? "",
  })
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    const next = { name: name.trim(), prelude: prelude?.trim() ?? "" }
    baselineRef.current = next
    setFieldValues(next)
  }, [name, prelude, pathId])

  const chronicleConfig = useChronicleConfig({
    entityKind: "path",
    entityId: pathId,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      const patch: Record<string, string> = {}
      if (current.name.trim() !== baseline.name.trim()) {
        patch.name = current.name.trim()
      }
      if (current.prelude !== baseline.prelude) {
        patch.prelude = current.prelude
      }
      if (Object.keys(patch).length === 0) return null
      return patch
    },
    validate: () => {
      if (fieldValuesRef.current.name.trim().length < 2) {
        return "Path name is required."
      }
      return null
    },
    onSaved: (field, value) => {
      if (typeof value !== "string") return
      baselineRef.current = { ...baselineRef.current, [field]: value }
      if (field === "name") {
        onLabelResolved?.(value)
      }
    },
    onRefresh,
  })

  const handleFieldChange = (key: keyof PathMetadataFields, value: string) => {
    chronicleConfig.markEdited()
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.name || name,
        avatar: "🛤",
        status: "Path",
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
          <p className="keeper-presence-field-label mb-1.5">Path name</p>
          <input
            value={fieldValues.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <p className="keeper-presence-field-label mb-1.5">Prelude</p>
          <textarea
            value={fieldValues.prelude}
            onChange={(e) => handleFieldChange("prelude", e.target.value)}
            rows={6}
            className={INPUT_CLASS}
            style={{ ...INPUT_STYLE, minHeight: "8rem" }}
            placeholder="What does this path gather?"
          />
        </div>
      </div>
    </ChronicleConfigShell>
  )
}
