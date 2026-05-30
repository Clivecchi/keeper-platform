"use client"

import * as React from "react"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import { resolveFieldLabel } from "../KeeperPresenceDefaults"
import { ChronicleConfigShell } from "../chronicleConfig/useChronicleConfig"
import type { ChronicleSaveStatus } from "../chronicleConfig/types"

export interface DomainConfigPresenceProps {
  fieldValues: Record<string, string>
  fieldErrors: Record<string, string>
  visibleFields: [string, FieldDefinition][]
  saveStatus: ChronicleSaveStatus
  saveMessage: string | null
  isDirty: boolean
  onBack: () => void
  onSave: () => void | Promise<void>
  onFieldChange: (key: string, value: string) => void
  renderFieldEditor: (
    key: string,
    def: FieldDefinition,
    placeholder?: string,
  ) => React.ReactNode
  /** IDE Board adds build-context fields on top of domain config. */
  ideBuildContextFields?: [string, FieldDefinition][]
}

const DOMAIN_FIELD_ORDER = [
  "name",
  "tagline",
  "keeperType",
  "purpose",
  "theme_color",
  "visibility",
] as const

const IDE_BUILD_FIELD_ORDER = [
  "buildContextName",
  "buildContextDescription",
  "activeRepository",
  "activeBranch",
  "environment",
] as const

export function DomainConfigPresence({
  fieldValues,
  fieldErrors,
  visibleFields,
  saveStatus,
  saveMessage,
  isDirty,
  onBack,
  onSave,
  onFieldChange,
  renderFieldEditor,
  ideBuildContextFields = [],
}: DomainConfigPresenceProps) {
  const fieldMap = React.useMemo(() => new Map(visibleFields), [visibleFields])
  const ideFieldMap = React.useMemo(
    () => new Map(ideBuildContextFields),
    [ideBuildContextFields],
  )

  const orderedKeys = DOMAIN_FIELD_ORDER.filter((key) => fieldMap.has(key))
  const ideKeys = IDE_BUILD_FIELD_ORDER.filter((key) => ideFieldMap.has(key))

  const placeholders: Record<string, string> = {
    name: "Domain name",
    tagline: "Short identity line",
    keeperType: "Keeper type / character",
    purpose: "What this domain is for",
    theme_color: "Theme color token",
    visibility: "public or private",
    buildContextName: "Build context name",
    buildContextDescription: "What this build context covers",
    activeRepository: "owner/repo",
    activeBranch: "main",
    environment: "development, preview, production…",
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.name ?? "",
        avatar: fieldValues.name?.slice(0, 1).toUpperCase(),
        status: fieldValues.status,
      }}
      onBack={onBack}
      saveStatus={saveStatus}
      saveMessage={saveMessage}
      isDirty={isDirty}
      onSave={onSave}
    >
      {orderedKeys.map((key) => {
        const def = fieldMap.get(key)
        if (!def) return null
        return (
          <div key={key} className="mb-4">
            <p className="keeper-presence-field-label mb-1.5">
              {key === "keeperType"
                ? "Character"
                : key === "purpose"
                  ? "Purpose"
                  : resolveFieldLabel(key, def)}
            </p>
            {renderFieldEditor(key, def, placeholders[key])}
            {fieldErrors[key] && (
              <p
                className="text-[12px] mt-1"
                style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
              >
                {fieldErrors[key]}
              </p>
            )}
          </div>
        )
      })}

      {ideKeys.length > 0 && (
        <div className="mt-2 mb-4">
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Build Context
          </p>
          {ideKeys.map((key) => {
            const def = ideFieldMap.get(key)
            if (!def) return null
            const label =
              key === "buildContextName"
                ? "Name"
                : key === "buildContextDescription"
                  ? "Description"
                  : resolveFieldLabel(key, def)
            return (
              <div key={key} className="mb-4">
                <p className="keeper-presence-field-label mb-1.5">{label}</p>
                {renderFieldEditor(key, def, placeholders[key])}
              </div>
            )
          })}
        </div>
      )}
    </ChronicleConfigShell>
  )
}
