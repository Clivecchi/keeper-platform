"use client"

import * as React from "react"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import { resolveFieldLabel } from "../KeeperPresenceDefaults"
import { AgentPromptsSection } from "../AgentPromptsSection"
import { ChronicleConfigShell } from "../chronicleConfig/useChronicleConfig"
import type { ChronicleSaveStatus } from "../chronicleConfig/types"

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
  onFieldChange: (key: string, value: string) => void
  onAdvancedOpenChange: (open: boolean) => void
  onAdvancedChange: (key: "temperature" | "max_tokens", value: string) => void
  advancedOpen: boolean
  advancedValues: { temperature: string; max_tokens: string }
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
  "avatar",
  "theme_color",
  "tools",
] as const

/**
 * Config Mode — compressed identity header + editable fields.
 * Same behavior pattern for all EntityKinds; agent-specific fields here.
 */
export function AgentConfigPresence({
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
  onFieldChange,
  onAdvancedOpenChange,
  onAdvancedChange,
  advancedOpen,
  advancedValues,
  renderFieldEditor,
}: AgentConfigPresenceProps) {
  const fieldMap = React.useMemo(
    () => new Map(visibleFields),
    [visibleFields],
  )

  const orderedKeys = CONFIG_FIELD_ORDER.filter((key) => fieldMap.has(key))

  const placeholders: Record<string, string> = {
    name: "Agent name",
    tagline: "Role line — how this agent is billed",
    purpose: "What this agent is for",
    personality: "Personality traits",
    lensSystemPrompt: "Agent voice — first person, present tense…",
    model: "Model identifier",
    // incomplete — static model list
    model_provider: "anthropic, openai, together…",
    avatar: "Avatar URL or emoji",
    theme_color: "Theme color token",
    // incomplete — input type
    tools: "Capability tags, comma-separated",
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.name ?? "",
        avatar: fieldValues.avatar,
        status: fieldValues.status,
      }}
      onBack={onBack}
      saveStatus={saveStatus}
      saveMessage={saveMessage}
      isDirty={isDirty}
      onSave={onSave}
    >
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

      {!hiddenFields.includes("lensSystemPrompt") && (
        <div className="mb-4">
          <p className="keeper-presence-field-label mb-1.5">Agent Voice (Lens Prompt)</p>
          <AgentPromptsSection
            lensValue={fieldValues.lensSystemPrompt ?? ""}
            composedValue={fieldValues.composedSystemPrompt ?? ""}
            showAgentVoice
            showComposed={!hiddenFields.includes("composedSystemPrompt")}
            lensError={fieldErrors.lensSystemPrompt}
            onLensChange={(v: string) => onFieldChange("lensSystemPrompt", v)}
          />
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
