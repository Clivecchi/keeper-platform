"use client"

import * as React from "react"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"
import {
  ChronicleCoverField,
  patchPresenceCover,
  type ChronicleCoverMedia,
} from "../chronicleConfig/ChronicleCoverField"
import { ChronicleRecordDelete } from "../chronicleConfig/ChronicleRecordDelete"
import { coverFromRecord } from "../cover/coverImageUtils"

export type MomentMetadataFields = {
  title: string
  narrative: string
}

const INPUT_CLASS =
  "w-full rounded-md border px-3 py-2 text-[13px] bg-transparent outline-none resize-y"

const INPUT_STYLE = {
  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
} as const

export function MomentConfigPresence({
  momentId,
  domainId,
  title,
  narrative,
  record,
  onBack,
  onRefresh,
  onLabelResolved,
  onDeleted,
}: {
  momentId: string
  domainId: string
  title: string
  narrative?: string | null
  record?: Record<string, unknown>
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
  onDeleted?: () => void
}) {
  const [coverRevision, setCoverRevision] = React.useState(0)

  const coverMedia = React.useMemo((): ChronicleCoverMedia => {
    const { coverImage, coverImageKey } = coverFromRecord(record ?? {})
    if (!coverImage) return null
    return { type: "image", url: coverImage, key: coverImageKey ?? undefined }
  }, [record, coverRevision])

  const baselineRef = React.useRef<MomentMetadataFields>({
    title: title.trim(),
    narrative: narrative?.trim() ?? "",
  })
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    const next = { title: title.trim(), narrative: narrative?.trim() ?? "" }
    baselineRef.current = next
    setFieldValues(next)
  }, [title, narrative, momentId])

  const chronicleConfig = useChronicleConfig({
    entityKind: "moment",
    entityId: momentId,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      const patch: Record<string, string> = {}
      if (current.title.trim() !== baseline.title.trim()) {
        patch.title = current.title.trim()
      }
      if (current.narrative !== baseline.narrative) {
        patch.narrative = current.narrative
      }
      if (Object.keys(patch).length === 0) return null
      return patch
    },
    validate: () => {
      if (fieldValuesRef.current.title.trim().length < 2) {
        return "Moment title is required."
      }
      const narrativeText = fieldValuesRef.current.narrative.trim()
      if (narrativeText.length > 0 && narrativeText.length < 10) {
        return "Narrative must be at least 10 characters when provided."
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

  const handleFieldChange = (key: keyof MomentMetadataFields, value: string) => {
    chronicleConfig.markEdited()
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.title || title,
        avatar: "✦",
        status: "Moment",
      }}
      onBack={onBack}
      saveStatus={chronicleConfig.saveStatus}
      saveMessage={chronicleConfig.saveMessage}
      isDirty={chronicleConfig.isDirty}
      onSave={() => void chronicleConfig.handleSave()}
      onDismissError={chronicleConfig.dismissSaveError}
    >
      <ChronicleCoverField
        value={coverMedia}
        themeBits={record?.presenceSchema}
        onSave={async (cover) => {
          await patchPresenceCover(`/api/moments/${encodeURIComponent(momentId)}`, cover)
        }}
        onSaved={() => {
          setCoverRevision((n) => n + 1)
          onRefresh?.()
        }}
      />

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
          <p className="keeper-presence-field-label mb-1.5">Narrative</p>
          <textarea
            value={fieldValues.narrative}
            onChange={(e) => handleFieldChange("narrative", e.target.value)}
            rows={8}
            className={INPUT_CLASS}
            style={{ ...INPUT_STYLE, minHeight: "10rem" }}
            placeholder="What happened here?"
          />
        </div>
      </div>

      {onDeleted ? (
        <ChronicleRecordDelete
          entityLabel="Moment"
          deleteEndpoint={`/api/moments/${encodeURIComponent(momentId)}`}
          onDeleted={onDeleted}
        />
      ) : null}
    </ChronicleConfigShell>
  )
}
