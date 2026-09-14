"use client"

import * as React from "react"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import { PRESENCE_SCHEMA_DEFAULTS, resolveFieldLabel } from "../KeeperPresenceDefaults"
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
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import { useAuth } from "../../../context/AuthContext"
import { applyDomainVisualFromImage } from "../../themes/applyDomainVisualFromImage"
import { DomainAddressesSection } from "./DomainAddressesSection"
import { DomainPeopleSection } from "./DomainPeopleSection"
import {
  DOMAIN_CONFIG_FRAME_DEFS,
  resolveDomainConfigFrame,
  type DomainConfigFrame,
} from "./domainConfigFrames"

export interface DomainConfigPresenceProps {
  domainId: string
  domainSlug: string
  /** Read-only Domain lead from settings.primaryAgentId — not an editor. */
  primaryAgentName?: string | null
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
  /** Open Configure on the People frame (from Cover). */
  focusPeople?: boolean
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

/** Domain Treatment — stored in frame_json.treatment; full on Chronicle/Presents, accent on Nav/Dialog. */
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
  color: "hsl(var(--theme-ink-secondary))",
}

const fieldPlaceholders: Record<string, string> = {
  name: "Domain name",
  tagline: "Short identity line",
  keeperType: "e.g. the Co-op Brand Builder",
  purpose: "What this domain is for",
  theme_color: "Theme color token",
  visibility: "public or private",
  treatmentName: "Warm Minimal",
  treatmentBackground: "#f5f0e8 or 121410",
  treatmentAccent: "#2d6a7f",
  treatmentFontFamily: "Georgia, serif",
  buildContextName: "Build context name",
  buildContextDescription: "What this build context covers",
  activeRepository: DEFAULT_GITHUB_REPOSITORY,
  activeBranch: DEFAULT_GITHUB_BRANCH,
  environment: "development, preview, production…",
}

const fieldLabels: Record<string, string> = {
  keeperType: "How it shows up",
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
                A short line for what this Domain is in Keeper. Not a membership role.
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
  primaryAgentName,
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
  focusPeople = false,
}: DomainConfigPresenceProps) {
  const v0Shell = useV0ShellOptional()
  const boardCtx = useUniversalBoardOptional()
  const { user } = useAuth()
  const [activeFrame, setActiveFrame] = React.useState<DomainConfigFrame>(() =>
    resolveDomainConfigFrame(focusPeople ? "people" : "identity"),
  )
  const fieldMap = React.useMemo(() => new Map(visibleFields), [visibleFields])
  const treatmentFieldMap = React.useMemo(() => {
    const defaults = PRESENCE_SCHEMA_DEFAULTS.domain?.fields ?? {}
    return new Map(
      TREATMENT_FIELD_ORDER.filter((key) => defaults[key]).map(
        (key) => [key, defaults[key]] as [string, FieldDefinition],
      ),
    )
  }, [])
  const ideFieldMap = React.useMemo(
    () => new Map(ideBuildContextFields),
    [ideBuildContextFields],
  )

  const identityKeys = IDENTITY_FIELD_ORDER.filter((key) => fieldMap.has(key))
  const presenceKeys = PRESENCE_FIELD_ORDER.filter((key) => fieldMap.has(key))
  const treatmentKeys = TREATMENT_FIELD_ORDER.filter((key) => treatmentFieldMap.has(key))
  const ideKeys = IDE_BUILD_FIELD_ORDER.filter((key) => ideFieldMap.has(key))

  const domainTag = fieldValues.slug?.trim() || domainSlug
  const includeBuild = ideKeys.length > 0
  const frames = DOMAIN_CONFIG_FRAME_DEFS.filter(
    (frame) => frame.id !== "build" || includeBuild,
  )

  React.useEffect(() => {
    setActiveFrame(resolveDomainConfigFrame(focusPeople ? "people" : "identity", { includeBuild }))
  }, [domainId, focusPeople, includeBuild])

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.name ?? "",
        avatar: fieldValues.name?.slice(0, 1).toUpperCase(),
        status: fieldValues.status,
      }}
      onNameChange={(value) => onFieldChange("name", value)}
      namePlaceholder="Domain name"
      onBack={onBack}
      saveStatus={saveStatus}
      saveMessage={saveMessage}
      isDirty={isDirty}
      onSave={onSave}
      subnav={
        <nav className="flex flex-wrap items-center gap-1" aria-label="Domain card frames">
          {frames.map((frame) => {
            const selected = frame.id === activeFrame
            return (
              <button
                key={frame.id}
                type="button"
                onClick={() => setActiveFrame(frame.id)}
                className="rounded-md px-2.5 py-1 text-[12px] font-semibold"
                style={{
                  color: selected
                    ? "var(--treatment-ink, hsl(var(--theme-ink-primary)))"
                    : "hsl(var(--theme-ink-secondary))",
                  background: selected
                    ? "var(--treatment-paper, hsl(var(--theme-surface-paper)))"
                    : "transparent",
                  border: selected
                    ? "1px solid var(--treatment-accent, hsl(var(--theme-border-soft)))"
                    : "1px solid transparent",
                }}
                aria-current={selected ? "page" : undefined}
              >
                {frame.label}
              </button>
            )
          })}
        </nav>
      }
    >
      <p className="text-[12px] mb-4" style={sectionLabelStyle}>
        {frames.find((frame) => frame.id === activeFrame)?.hint}
      </p>

      {activeFrame === "identity" ? (
        <>
      <ChronicleCoverField
        label="Cover image"
        description="The domain's look — board and Chronicle atmosphere, and the colors extracted from this image. Library shelves hold more images without changing this."
        value={coverMedia}
        themeBits={existingTheme}
        onSave={async (cover) => {
          if (!cover?.url) {
            await patchDomainThemeCover(domainId, existingTheme, cover)
            await v0Shell?.reloadDomainFrame()
            return
          }
          await applyDomainVisualFromImage({
            domainId,
            domainSlug,
            existingTheme,
            imageUrl: cover.url,
            imageKey: cover.key ?? null,
            createLibraryItem: true,
            userId: user?.id,
            displayLabel: "Domain cover",
          })
          boardCtx?.actions.bumpLibraryNav()
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

      {primaryAgentName?.trim() ? (
        <div className="mb-4">
          <p className="keeper-presence-field-label mb-1.5">Primary Agent</p>
          <p className="text-sm" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {primaryAgentName.trim()}
          </p>
          <p className="text-[11px] mt-1" style={sectionLabelStyle}>
            Who primarily works with this Domain. Change the lead on Agent Board.
          </p>
        </div>
      ) : null}
        </>
      ) : null}

      {activeFrame === "people" ? (
        <DomainPeopleSection domainId={domainId} embedded />
      ) : null}

      {activeFrame === "addresses" ? (
        <DomainAddressesSection
          domainId={domainId}
          domainTag={domainTag}
          domainTagError={fieldErrors.slug}
          onDomainTagChange={(value) => onFieldChange("slug", value)}
          customDomain={customDomain}
          customDomainVerified={customDomainVerified}
          onAddressesUpdated={onAddressesUpdated}
          embedded
        />
      ) : null}

      {activeFrame === "presence" ? (
        <>
          {presenceKeys.length > 0 ? (
            <ConfigFieldGroup
              keys={presenceKeys}
              fieldMap={fieldMap}
              fieldErrors={fieldErrors}
              placeholders={fieldPlaceholders}
              labels={fieldLabels}
              renderFieldEditor={renderFieldEditor}
            />
          ) : null}
          {treatmentKeys.length > 0 ? (
            <div className="mt-2 mb-4">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-1"
                style={sectionLabelStyle}
              >
                Look
              </p>
              <p className="text-[11px] mb-3" style={sectionLabelStyle}>
                How Chronicle and Presents feel. Nav and Dialog take the accent.
              </p>
              <ConfigFieldGroup
                keys={treatmentKeys}
                fieldMap={treatmentFieldMap}
                fieldErrors={fieldErrors}
                placeholders={fieldPlaceholders}
                labels={fieldLabels}
                renderFieldEditor={renderFieldEditor}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {activeFrame === "build" && includeBuild ? (
        <ConfigFieldGroup
          keys={ideKeys}
          fieldMap={ideFieldMap}
          fieldErrors={fieldErrors}
          placeholders={fieldPlaceholders}
          renderFieldEditor={renderFieldEditor}
        />
      ) : null}
    </ChronicleConfigShell>
  )
}
