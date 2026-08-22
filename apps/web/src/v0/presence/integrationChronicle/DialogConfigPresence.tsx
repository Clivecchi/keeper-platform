"use client"

import * as React from "react"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"

export type DialogMetadataFields = {
  title: string
  forwardTitle: string
  forwardDescription: string
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
  forwardTitle = "",
  forwardDescription = "",
  contextSummary,
  onBack,
  onRefresh,
  onLabelResolved,
}: {
  dialogId: string
  domainId: string
  title: string
  forwardTitle?: string
  forwardDescription?: string
  contextSummary?: string | null
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
}) {
  const baselineRef = React.useRef<DialogMetadataFields>({
    title: title.trim(),
    forwardTitle: forwardTitle.trim(),
    forwardDescription: forwardDescription.trim(),
  })
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    const next = {
      title: title.trim(),
      forwardTitle: forwardTitle.trim(),
      forwardDescription: forwardDescription.trim(),
    }
    baselineRef.current = next
    setFieldValues(next)
  }, [title, forwardTitle, forwardDescription, dialogId])

  const chronicleConfig = useChronicleConfig({
    entityKind: "dialog",
    entityId: dialogId,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      const payload: Record<string, unknown> = {}
      if (current.title.trim() !== baseline.title.trim()) {
        payload.title = current.title.trim()
      }
      if (current.forwardTitle.trim() !== baseline.forwardTitle.trim()) {
        payload.forward_title = current.forwardTitle.trim() || null
      }
      if (current.forwardDescription.trim() !== baseline.forwardDescription.trim()) {
        payload.forward_description = current.forwardDescription.trim() || null
      }
      return Object.keys(payload).length > 0 ? payload : null
    },
    validate: () => {
      if (fieldValuesRef.current.title.trim().length < 1) {
        return "Dialog title is required."
      }
      return null
    },
    onSaved: (field, value) => {
      if (typeof value !== "string" && value !== null) return
      if (field === "title" && typeof value === "string") {
        baselineRef.current = { ...baselineRef.current, title: value }
        onLabelResolved?.(value)
        return
      }
      if (field === "forward_title") {
        baselineRef.current = {
          ...baselineRef.current,
          forwardTitle: typeof value === "string" ? value : "",
        }
        return
      }
      if (field === "forward_description") {
        baselineRef.current = {
          ...baselineRef.current,
          forwardDescription: typeof value === "string" ? value : "",
        }
      }
    },
    onRefresh,
  })

  const handleFieldChange = (field: keyof DialogMetadataFields, value: string) => {
    chronicleConfig.markEdited()
    setFieldValues((prev) => ({ ...prev, [field]: value }))
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
            onChange={(e) => handleFieldChange("title", e.target.value)}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <p className="keeper-presence-field-label mb-1.5">Forward</p>
          <p
            className="mb-2 text-[12px] leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            The directional objective of this Dialog — where the conversation is going.
          </p>
          <input
            value={fieldValues.forwardTitle}
            onChange={(e) => handleFieldChange("forwardTitle", e.target.value)}
            placeholder="Forward title"
            className={`${INPUT_CLASS} mb-2`}
            style={INPUT_STYLE}
          />
          <textarea
            value={fieldValues.forwardDescription}
            onChange={(e) => handleFieldChange("forwardDescription", e.target.value)}
            placeholder="Write the directional objective"
            rows={5}
            className={INPUT_CLASS}
            style={{ ...INPUT_STYLE, minHeight: 120, resize: "vertical" }}
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
