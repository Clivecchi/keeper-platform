"use client"

import * as React from "react"
import type { KipDraftStatus } from "../../../lib/kipApi"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import { draftChronicleTitle } from "../cover/schemas/draftCoverSchema"

export type DraftMetadataFields = {
  title: string
  status: KipDraftStatus
}

const DRAFT_STATUSES: KipDraftStatus[] = [
  "draft",
  "reviewed",
  "approved",
  "promoted",
  "archived",
]

const INPUT_CLASS =
  "w-full rounded-md border px-3 py-2 text-[13px] bg-transparent outline-none"

const INPUT_STYLE = {
  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
} as const

function normalizeStatus(value: unknown): KipDraftStatus {
  if (typeof value === "string" && (DRAFT_STATUSES as readonly string[]).includes(value)) {
    return value as KipDraftStatus
  }
  return "draft"
}

export function DraftConfigPresence({
  draftId,
  domainId,
  title,
  kind,
  status,
  onBack,
  onRefresh,
  onLabelResolved,
}: {
  draftId: string
  domainId: string
  title: string
  kind?: string | null
  status?: string | null
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
}) {
  const board = useUniversalBoardOptional()

  const baselineRef = React.useRef<DraftMetadataFields>({
    title: title.trim(),
    status: normalizeStatus(status),
  })
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    const next = {
      title: title.trim(),
      status: normalizeStatus(status),
    }
    baselineRef.current = next
    setFieldValues(next)
  }, [title, status, draftId])

  const chronicleConfig = useChronicleConfig({
    entityKind: "draft",
    entityId: draftId,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      const patch: Record<string, string> = {}
      if (current.title.trim() !== baseline.title.trim()) {
        patch.title = current.title.trim()
      }
      if (current.status !== baseline.status) {
        patch.status = current.status
      }
      if (Object.keys(patch).length === 0) return null
      return patch
    },
    validate: () => {
      if (fieldValuesRef.current.title.trim().length < 1) {
        return "Draft title is required."
      }
      return null
    },
    onSaved: (field, value) => {
      if (typeof value !== "string") return
      baselineRef.current = { ...baselineRef.current, [field]: value }
      if (field === "title") {
        onLabelResolved?.(value)
        board?.actions.bumpDraftNav({ draftId, title: value })
      } else if (field === "status") {
        board?.actions.bumpDraftNav({ draftId })
      }
    },
    onRefresh,
  })

  const handleFieldChange = <K extends keyof DraftMetadataFields>(
    key: K,
    value: DraftMetadataFields[K],
  ) => {
    chronicleConfig.markEdited()
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: draftChronicleTitle({ title: fieldValues.title, id: draftId }),
        avatar: "📝",
        status: "Draft",
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
          <p className="keeper-presence-field-label mb-1.5">Status</p>
          <select
            value={fieldValues.status}
            onChange={(e) =>
              handleFieldChange("status", normalizeStatus(e.target.value))
            }
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          >
            {DRAFT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        {kind ? (
          <div>
            <p className="keeper-presence-field-label mb-1.5">Kind</p>
            <p
              className="text-[13px] rounded-md border px-3 py-2"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                color: "hsl(var(--theme-ink-secondary))",
              }}
            >
              {kind.replace(/_/g, " ")}
            </p>
          </div>
        ) : null}
      </div>
    </ChronicleConfigShell>
  )
}
