"use client"

import * as React from "react"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import { resolveFieldLabel } from "../KeeperPresenceDefaults"
import { ComposedPromptPreview } from "../ComposedPromptPreview.tsx"
import { ChronicleConfigShell } from "../chronicleConfig/useChronicleConfig"
import type { ChronicleSaveStatus } from "../chronicleConfig/types"
import {
  ChronicleVisualUploadField,
  patchPresenceAvatar,
  type ChronicleCoverMedia,
} from "../chronicleConfig/ChronicleCoverField"
import { avatarFromRecord, themeContainerFromRecord } from "../cover/coverImageUtils"

export interface AgentConfigPresenceProps {
  objectId: string
  record: Record<string, unknown>
  fieldValues: Record<string, string>
  fieldErrors: Record<string, string>
  hiddenFields: string[]
  visibleFields: [string, FieldDefinition][]
  domainDisplayName?: string
  domainSlug?: string
  saveStatus: ChronicleSaveStatus
  saveMessage: string | null
  isDirty: boolean
  onBack: () => void
  onSave: () => void | Promise<void>
  onDismissSaveError?: () => void
  onFieldChange: (key: string, value: string) => void
  onAdvancedOpenChange: (open: boolean) => void
  onAdvancedChange: (key: "temperature" | "max_tokens", value: string) => void
  advancedOpen: boolean
  advancedValues: { temperature: string; max_tokens: string }
  onAvatarSaved?: () => void
  /** Field editor from KeeperPresence — shared save path */
  renderFieldEditor: (
    key: string,
    def: FieldDefinition,
    placeholder?: string,
  ) => React.ReactNode
}

const CONFIG_FIELD_ORDER = [
  "name",
  "tagline",
  "purpose",
  "personality",
  "model",
  "model_provider",
  "memory_enabled",
  "visibility",
  "theme_color",
  "tools",
] as const

/**
 * Config Mode — compressed identity header + editable fields.
 * Same behavior pattern for all EntityKinds; agent-specific fields here.
 */
export function AgentConfigPresence({
  objectId,
  record,
  fieldValues,
  fieldErrors,
  hiddenFields,
  visibleFields,
  domainDisplayName,
  domainSlug,
  saveStatus,
  saveMessage,
  isDirty,
  onBack,
  onSave,
  onDismissSaveError,
  onFieldChange,
  onAdvancedOpenChange,
  onAdvancedChange,
  advancedOpen,
  advancedValues,
  onAvatarSaved,
  renderFieldEditor,
}: AgentConfigPresenceProps) {
  const [avatarRevision, setAvatarRevision] = React.useState(0)

  const avatarMedia = React.useMemo((): ChronicleCoverMedia => {
    const { avatar, avatarKey } = avatarFromRecord(record)
    if (!avatar || !/^https?:\/\//.test(avatar)) return null
    return { type: "image", url: avatar, key: avatarKey ?? undefined }
  }, [record, avatarRevision])

  const fieldMap = React.useMemo(
    () => new Map(visibleFields),
    [visibleFields],
  )

  const orderedKeys = CONFIG_FIELD_ORDER.filter((key) => fieldMap.has(key))

  const identityAvatar =
    avatarMedia?.url ?? fieldValues.avatar?.trim() ?? fieldValues.name?.slice(0, 1).toUpperCase()

  const placeholders: Record<string, string> = {
    name: "Agent name",
    tagline: "Role line — how this agent is billed",
    purpose: "What this agent is for",
    personality: "Personality traits",
    lensSystemPrompt: "How this agent thinks and what it knows…",
    model: "Model identifier",
    // incomplete — static model list
    model_provider: "anthropic, openai, together-ai…",
    avatar: "Avatar URL or emoji",
    theme_color: "Theme color token",
    // incomplete — input type
    tools: "Capability tags, comma-separated",
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.name ?? "",
        avatar: identityAvatar,
        status: fieldValues.status,
      }}
      onBack={onBack}
      saveStatus={saveStatus}
      saveMessage={saveMessage}
      isDirty={isDirty}
      onSave={onSave}
      onDismissError={onDismissSaveError}
    >
      <ChronicleVisualUploadField
        label="Avatar"
        uploadRole="avatar"
        description="Agent portrait on the cover card. Each upload adds a theme bit — object theme follows upload order."
        value={avatarMedia}
        themeBits={themeContainerFromRecord(record)}
        onSave={async (avatar) => {
          await patchPresenceAvatar(`/api/agents/${encodeURIComponent(objectId)}`, avatar)
        }}
        onSaved={() => {
          setAvatarRevision((n) => n + 1)
          onAvatarSaved?.()
        }}
      />

      {/* Domain assignment — incomplete — no save path */}
      <div className="mb-4">
        <p className="keeper-presence-field-label mb-1.5">Domain Assignment</p>
        <p
          className="text-[14px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {domainDisplayName?.trim() || domainSlug?.trim() || "Current domain"}
        </p>
      </div>

      {orderedKeys.map((key) => {
        const def = fieldMap.get(key)
        if (!def) return null
        return (
          <div key={key} className="mb-4">
            <p className="keeper-presence-field-label mb-1.5">
              {key === "tagline" ? "Role" : resolveFieldLabel(key, def)}
            </p>
            {renderFieldEditor(key, def, placeholders[key])}
          </div>
        )
      })}

      {!hiddenFields.includes("avatar") && (
        <div className="mb-4">
          <p className="keeper-presence-field-label mb-1.5">Avatar fallback</p>
          <p
            className="text-[12px] mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Emoji or short text when no portrait image is uploaded.
          </p>
          {renderFieldEditor(
            "avatar",
            fieldMap.get("avatar") ?? { role: "ambient", editable: true, label: "Avatar" },
            placeholders.avatar,
          )}
        </div>
      )}

      {!hiddenFields.includes("lensSystemPrompt") && (
        <div className="mb-4">
          <p className="keeper-presence-field-label mb-1">System Prompt</p>
          <p
            className="text-[12px] mb-2 leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            How this agent thinks and what it knows.
          </p>
          <textarea
            value={fieldValues.lensSystemPrompt ?? ""}
            onChange={(e) => onFieldChange("lensSystemPrompt", e.target.value)}
            rows={6}
            placeholder={placeholders.lensSystemPrompt}
            className="w-full resize-y rounded-md border px-3 py-2.5 font-mono text-[14px] leading-relaxed bg-transparent outline-none"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.5)",
              color: "hsl(var(--theme-ink-primary))",
              minHeight: "9rem",
            }}
          />
          {fieldErrors.lensSystemPrompt ? (
            <p
              className="text-[13px] mt-2 leading-relaxed"
              style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
            >
              {fieldErrors.lensSystemPrompt}
            </p>
          ) : null}
        </div>
      )}

      {!hiddenFields.includes("composedSystemPrompt") &&
        fieldValues.composedSystemPrompt?.trim() && (
          <div className="mb-4">
            <p className="keeper-presence-field-label mb-1.5">Runtime assembly</p>
            <ComposedPromptPreview value={fieldValues.composedSystemPrompt} />
          </div>
        )}

      <div className="mb-4">
        <button
          type="button"
          onClick={() => onAdvancedOpenChange(!advancedOpen)}
          className="w-full flex items-center justify-between text-left py-2"
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Advanced model settings
          </span>
          <span
            className="text-[12px]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {advancedOpen ? "Hide" : "Show"}
          </span>
        </button>
        {advancedOpen && (
          <div className="space-y-3 pt-1">
            <div>
              <p className="keeper-presence-field-label mb-1.5">Temperature</p>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={advancedValues.temperature}
                onChange={(e) => onAdvancedChange("temperature", e.target.value)}
                className="w-full rounded-md border px-2.5 py-1.5 text-[14px] bg-transparent"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                  color: "hsl(var(--theme-ink-secondary))",
                }}
              />
            </div>
            <div>
              <p className="keeper-presence-field-label mb-1.5">Max tokens</p>
              <input
                type="number"
                min={256}
                step={256}
                value={advancedValues.max_tokens}
                onChange={(e) => onAdvancedChange("max_tokens", e.target.value)}
                className="w-full rounded-md border px-2.5 py-1.5 text-[14px] bg-transparent"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                  color: "hsl(var(--theme-ink-secondary))",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </ChronicleConfigShell>
  )
}
