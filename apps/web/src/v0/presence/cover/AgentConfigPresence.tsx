"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import { resolveFieldLabel } from "../KeeperPresenceDefaults"
import { AgentPromptsSection } from "../AgentPromptsSection"

export interface AgentConfigPresenceProps {
  objectId: string
  record: Record<string, unknown>
  fieldValues: Record<string, string>
  fieldErrors: Record<string, string>
  hiddenFields: string[]
  visibleFields: [string, FieldDefinition][]
  domainDisplayName?: string
  domainSlug?: string
  saveStatus: "idle" | "saving" | "saved" | "error"
  saveMessage: string | null
  isDirty: boolean
  advancedOpen: boolean
  advancedValues: { temperature: string; max_tokens: string }
  onBack: () => void
  onSave: () => void | Promise<void>
  onFieldChange: (key: string, value: string) => void
  onAdvancedOpenChange: (open: boolean) => void
  onAdvancedChange: (key: "temperature" | "max_tokens", value: string) => void
  /** Field editor from KeeperPresence — shared save path */
  renderFieldEditor: (
    key: string,
    def: FieldDefinition,
    placeholder?: string,
  ) => React.ReactNode
}

function ConfigIdentityHeader({
  name,
  avatar,
  status,
  onBack,
}: {
  name: string
  avatar?: string
  status?: string
  onBack: () => void
}) {
  const displayAvatar = avatar?.trim() || "◇"
  const isLive = (status ?? "").toLowerCase().includes("ready") ||
    (status ?? "").toLowerCase().includes("active")

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-3 py-2.5"
      style={{
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)",
        background: "hsl(var(--theme-surface-elevated) / 0.08)",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 p-1 rounded-md transition-opacity hover:opacity-75"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
        aria-label="Back to cover"
      >
        <ArrowLeftIcon className="w-4 h-4" />
      </button>

      <div
        className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-sm border"
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.45)",
          background: "hsl(var(--theme-surface-panel) / 0.5)",
          color: "hsl(var(--theme-ink-secondary))",
        }}
        aria-hidden
      >
        {displayAvatar.length <= 2 ? displayAvatar : displayAvatar.slice(0, 2)}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="text-[14px] font-medium truncate"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {name || "Untitled agent"}
        </p>
        {status?.trim() && (
          <p
            className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {isLive && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--theme-status-success, 152 69% 43%))" }}
                aria-hidden
              />
            )}
            {status}
          </p>
        )}
      </div>
    </div>
  )
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
  advancedOpen,
  advancedValues,
  onBack,
  onSave,
  onFieldChange,
  onAdvancedOpenChange,
  onAdvancedChange,
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
    model_provider: "anthropic, openai, together…",
    avatar: "Avatar URL or emoji",
    theme_color: "Theme color token",
    tools: "Capability tags, comma-separated",
  }

  return (
    <motion.div
      className="flex flex-col h-full min-h-0"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      data-cover-mode="config"
    >
      <ConfigIdentityHeader
        name={fieldValues.name ?? ""}
        avatar={fieldValues.avatar}
        status={fieldValues.status}
        onBack={onBack}
      />

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4">
        {/* Domain assignment — context anchor, read-only */}
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
      </div>

      {/* Persistent save bar */}
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-3"
        style={{
          borderTop: "1px solid hsl(var(--theme-border-soft) / 0.4)",
          background: "hsl(var(--theme-surface-elevated) / 0.06)",
        }}
      >
        <div className="min-w-0" aria-live="polite">
          {saveStatus === "saving" && (
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              Saving…
            </p>
          )}
          {saveStatus === "saved" && saveMessage && (
            <p
              className="text-[12px] font-medium"
              style={{ color: "hsl(var(--theme-status-success, 152 69% 43%))" }}
            >
              {saveMessage}
            </p>
          )}
          {saveStatus === "error" && saveMessage && (
            <p
              className="text-[12px] font-medium"
              style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
            >
              {saveMessage}
            </p>
          )}
          {saveStatus === "idle" && isDirty && (
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              Unsaved changes
            </p>
          )}
          {saveStatus === "idle" && !isDirty && (
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              Ready to save
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saveStatus === "saving"}
          className="shrink-0 rounded-md px-4 py-2 text-[13px] font-semibold transition-opacity disabled:opacity-45"
          style={{
            background: "hsl(var(--theme-accent-primary, var(--theme-ink-primary)))",
            color: "hsl(var(--theme-surface-base, 0 0% 100%))",
          }}
        >
          {saveStatus === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
    </motion.div>
  )
}

export function AgentConfigPresenceShell(props: AgentConfigPresenceProps) {
  return (
    <AnimatePresence mode="wait">
      <AgentConfigPresence key="config" {...props} />
    </AnimatePresence>
  )
}
