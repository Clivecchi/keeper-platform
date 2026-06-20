"use client"

import * as React from "react"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"

export type DialogMetadataFields = {
  title: string
}

const INPUT_CLASS =
  "w-full rounded-md border px-3 py-2 text-[13px] bg-transparent outline-none"

const INPUT_STYLE = {
  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
} as const

export function DialogConfigPresence({
  dialogId,
  domainId,
  title,
  contextSummary,
  onBack,
  onRefresh,
  onLabelResolved,
}: {
  dialogId: string
  domainId: string
  title: string
  contextSummary?: string | null
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
}) {
  const baselineRef = React.useRef<DialogMetadataFields>({
    title: title.trim(),
  })
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    const next = { title: title.trim() }
    baselineRef.current = next
    setFieldValues(next)
  }, [title, dialogId])

  const chronicleConfig = useChronicleConfig({
    entityKind: "dialog",
    entityId: dialogId,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      if (current.title.trim() === baseline.title.trim()) return null
      return { title: current.title.trim() }
    },
    validate: () => {
      if (fieldValuesRef.current.title.trim().length < 1) {
        return "Dialog title is required."
      }
      return null
    },
    onSaved: (field, value) => {
      if (typeof value !== "string") return
      baselineRef.current = { ...baselineRef.current, [field]: value }
      if (field === "title") {
        onLabelResolved?.(value)
      }
    },
    onRefresh,
  })

  const handleFieldChange = (value: string) => {
    chronicleConfig.markEdited()
    setFieldValues({ title: value })
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.title || title,
        avatar: "💬",
        status: "Dialog",
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
          <p className="keeper-presence-field-label mb-1.5">Title</p>
          <input
            value={fieldValues.title}
            onChange={(e) => handleFieldChange(e.target.value)}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        </div>
        {contextSummary?.trim() ? (
          <div>
            <p className="keeper-presence-field-label mb-1.5">Scope</p>
            <p
              className="text-[13px] leading-relaxed rounded-md border px-3 py-2"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                color: "hsl(var(--theme-ink-secondary))",
              }}
            >
              {contextSummary}
            </p>
          </div>
        ) : null}
      </div>
    </ChronicleConfigShell>
  )
}
