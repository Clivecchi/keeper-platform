"use client"

import * as React from "react"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import { resolveFieldLabel } from "../KeeperPresenceDefaults"
import {
  DEFAULT_GITHUB_BRANCH,
  DEFAULT_GITHUB_REPOSITORY,
} from "../../../lib/githubIntegrationDefaults"
import { ChronicleConfigShell } from "../chronicleConfig/useChronicleConfig"
import type { ChronicleSaveStatus } from "../chronicleConfig/types"
import {
  ChronicleCoverField,
  patchDomainThemeCover,
  type ChronicleCoverMedia,
} from "../chronicleConfig/ChronicleCoverField"
import { useV0ShellOptional } from "../../shell/V0ShellContext"
import { DomainAddressesSection } from "./DomainAddressesSection"
import { DomainPeopleSection } from "./DomainPeopleSection"

export interface DomainConfigPresenceProps {
  domainId: string
  domainSlug: string
  customDomain?: string | null
  customDomainVerified?: boolean
  onAddressesUpdated?: (patch: {
    customDomain?: string | null
    customDomainVerified?: boolean
  }) => void
  existingTheme?: Record<string, unknown>
  coverMedia: ChronicleCoverMedia
  fieldValues: Record<string, string>
  fieldErrors: Record<string, string>
  visibleFields: [string, FieldDefinition][]
  saveStatus: ChronicleSaveStatus
  saveMessage: string | null
  isDirty: boolean
  onBack: () => void
  onSave: () => void | Promise<void>
  onFieldChange: (key: string, value: string) => void
  onCoverSaved?: () => void
  renderFieldEditor: (
    key: string,
    def: FieldDefinition,
    placeholder?: string,
  ) => React.ReactNode
  ideBuildContextFields?: [string, FieldDefinition][]
}

/** Display name + brand line — not platform addressing. */
const IDENTITY_FIELD_ORDER = ["name", "tagline"] as const

/** How the domain presents on Keeper — character, intent, look, access. */
const PRESENCE_FIELD_ORDER = [
  "keeperType",
  "purpose",
  "theme_color",
  "visibility",
] as const

/** Chronicle Treatment — stored in frame_json.treatment; affects right panel only. */
const TREATMENT_FIELD_ORDER = [
  "treatmentName",
  "treatmentBackground",
  "treatmentAccent",
  "treatmentFontFamily",
] as const

const IDE_BUILD_FIELD_ORDER = [
  "buildContextName",
  "buildContextDescription",
  "activeRepository",
  "activeBranch",
  "environment",
] as const

const sectionLabelStyle: React.CSSProperties = {
  color: "hsl(var(--theme-ink-tertiary))",
}

const fieldPlaceholders: Record<string, string> = {
  name: "Domain name",
  tagline: "Short identity line",
  keeperType: "e.g. the Co-op Brand Builder",
  purpose: "What this domain is for",
  theme_color: "Theme color token",
  visibility: "public or private",
  treatmentName: "Warm Minimal",
  treatmentBackground: "#f5f0e8",
  treatmentAccent: "#2d6a7f",
  treatmentFontFamily: "Georgia, serif",
  buildContextName: "Build context name",
  buildContextDescription: "What this build context covers",
  activeRepository: DEFAULT_GITHUB_REPOSITORY,
  activeBranch: DEFAULT_GITHUB_BRANCH,
  environment: "development, preview, production…",
}

const fieldLabels: Record<string, string> = {
  keeperType: "Character",
  purpose: "Purpose",
  theme_color: "Theme color",
  visibility: "Visibility",
  treatmentName: "Treatment name",
  treatmentBackground: "Chronicle background",
  treatmentAccent: "Chronicle accent",
  treatmentFontFamily: "Chronicle font",
}

function ConfigFieldGroup({
  keys,
  fieldMap,
  fieldErrors,
  placeholders,
  labels,
  renderFieldEditor,
}: {
  keys: readonly string[]
  fieldMap: Map<string, FieldDefinition>
  fieldErrors: Record<string, string>
  placeholders: Record<string, string>
  labels?: Record<string, string>
  renderFieldEditor: DomainConfigPresenceProps["renderFieldEditor"]
}) {
  return (
    <>
      {keys.map((key) => {
        const def = fieldMap.get(key)
        if (!def) return null
        const label = labels?.[key] ?? resolveFieldLabel(key, def)
        return (
          <div key={key} className="mb-4">
            <p className="keeper-presence-field-label mb-1.5">{label}</p>
            {renderFieldEditor(key, def, placeholders[key])}
            {fieldErrors[key] ? (
              <p
                className="text-[12px] mt-1"
                style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
              >
                {fieldErrors[key]}
              </p>
            ) : null}
            {key === "keeperType" ? (
              <p className="text-[11px] mt-1" style={sectionLabelStyle}>
                How this domain shows up in Keeper — type, role, or persona line.
              </p>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

export function DomainConfigPresence({
  domainId,
  domainSlug,
  customDomain,
  customDomainVerified,
  onAddressesUpdated,
  existingTheme,
  coverMedia,
  fieldValues,
  fieldErrors,
  visibleFields,
  saveStatus,
  saveMessage,
  isDirty,
  onBack,
  onSave,
  onFieldChange,
  onCoverSaved,
  renderFieldEditor,
  ideBuildContextFields = [],
}: DomainConfigPresenceProps) {
  const v0Shell = useV0ShellOptional()
  const fieldMap = React.useMemo(() => new Map(visibleFields), [visibleFields])
  const ideFieldMap = React.useMemo(
    () => new Map(ideBuildContextFields),
    [ideBuildContextFields],
  )

  const identityKeys = IDENTITY_FIELD_ORDER.filter((key) => fieldMap.has(key))
  const presenceKeys = PRESENCE_FIELD_ORDER.filter((key) => fieldMap.has(key))
  const treatmentKeys = TREATMENT_FIELD_ORDER.filter((key) => fieldMap.has(key))
  const ideKeys = IDE_BUILD_FIELD_ORDER.filter((key) => ideFieldMap.has(key))

  const domainTag = fieldValues.slug?.trim() || domainSlug

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
      <ChronicleCoverField
        label="Cover image"
        description="The domain's visual identity — shown on the cover card and as the background across frames."
        value={coverMedia}
        themeBits={existingTheme}
        onSave={async (cover) => {
          await patchDomainThemeCover(domainId, existingTheme, cover)
          await v0Shell?.reloadDomainFrame()
        }}
        onSaved={onCoverSaved}
      />

      <ConfigFieldGroup
        keys={identityKeys}
        fieldMap={fieldMap}
        fieldErrors={fieldErrors}
        placeholders={fieldPlaceholders}
        renderFieldEditor={renderFieldEditor}
      />

      <DomainAddressesSection
        domainId={domainId}
        domainTag={domainTag}
        domainTagError={fieldErrors.slug}
        onDomainTagChange={(value) => onFieldChange("slug", value)}
        customDomain={customDomain}
        customDomainVerified={customDomainVerified}
        onAddressesUpdated={onAddressesUpdated}
      />

      {presenceKeys.length > 0 ? (
        <div
          className="mt-6 mb-4 pt-5 border-t"
          style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={sectionLabelStyle}
          >
            Presence
          </p>
          <ConfigFieldGroup
            keys={presenceKeys}
            fieldMap={fieldMap}
            fieldErrors={fieldErrors}
            placeholders={fieldPlaceholders}
            labels={fieldLabels}
            renderFieldEditor={renderFieldEditor}
          />
        </div>
      ) : null}

      {treatmentKeys.length > 0 ? (
        <div
          className="mt-6 mb-4 pt-5 border-t"
          style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-1"
            style={sectionLabelStyle}
          >
            Treatment
          </p>
          <p className="text-[11px] mb-3" style={sectionLabelStyle}>
            How Chronicle feels on this domain — background, accent, and type. Does not change the
            center dialog or navigation.
          </p>
          <ConfigFieldGroup
            keys={treatmentKeys}
            fieldMap={fieldMap}
            fieldErrors={fieldErrors}
            placeholders={fieldPlaceholders}
            labels={fieldLabels}
            renderFieldEditor={renderFieldEditor}
          />
        </div>
      ) : null}

      <DomainPeopleSection domainId={domainId} />

      {ideKeys.length > 0 ? (
        <div
          className="mt-6 mb-4 pt-5 border-t"
          style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={sectionLabelStyle}
          >
            Build context
          </p>
          <ConfigFieldGroup
            keys={ideKeys}
            fieldMap={ideFieldMap}
            fieldErrors={fieldErrors}
            placeholders={fieldPlaceholders}
            renderFieldEditor={renderFieldEditor}
          />
        </div>
      ) : null}
    </ChronicleConfigShell>
  )
}
