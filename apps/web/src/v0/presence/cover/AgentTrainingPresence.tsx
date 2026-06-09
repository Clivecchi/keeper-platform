"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { apiFetch } from "../../../lib/api"
import {
  VOICE_PROMPT_SECTIONS,
  parseVoicePromptSections,
  patchVoicePromptSection,
  type VoicePromptSectionKey,
} from "./voicePromptSections"

export interface AgentTrainingPresenceProps {
  objectId: string
  domainId: string
  voicePrompt: string
  identity: {
    name: string
    avatar?: string
    status?: string
  }
  onVoicePromptSaved: (next: string) => void
}

type SectionSaveStatus = "idle" | "saving" | "saved" | "error"

function TrainingIdentityHeader({
  name,
  avatar,
  status,
}: AgentTrainingPresenceProps["identity"]) {
  const displayAvatar = avatar?.trim() || "◇"
  const isLive =
    (status ?? "").toLowerCase().includes("ready") ||
    (status ?? "").toLowerCase().includes("active")

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-3 py-2.5"
      style={{
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)",
        background: "hsl(var(--theme-surface-elevated) / 0.08)",
      }}
    >
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
          {name || "Untitled"}
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

function TrainingSectionPanel({
  sectionKey,
  label,
  placeholder,
  content,
  voicePrompt,
  objectId,
  domainId,
  onVoicePromptSaved,
}: {
  sectionKey: VoicePromptSectionKey
  label: string
  placeholder: string
  content: string
  voicePrompt: string
  objectId: string
  domainId: string
  onVoicePromptSaved: (next: string) => void
}) {
  const [open, setOpen] = React.useState(sectionKey === "currently")
  const [draft, setDraft] = React.useState(content)
  const [editing, setEditing] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<SectionSaveStatus>("idle")
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    setDraft(content)
    setEditing(false)
    setSaveStatus("idle")
    setSaveMessage(null)
  }, [content, objectId])

  React.useEffect(() => {
    if (saveStatus !== "saved") return
    const timer = window.setTimeout(() => {
      setSaveStatus("idle")
      setSaveMessage(null)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [saveStatus])

  const handleSave = async () => {
    const trimmed = draft.trim()
    if (trimmed.length > 0 && trimmed.length < 10) {
      setSaveStatus("error")
      setSaveMessage("Section must be at least 10 characters, or leave empty.")
      return
    }

    const nextPrompt = patchVoicePromptSection(voicePrompt, sectionKey, trimmed)
    setSaveStatus("saving")
    setSaveMessage(null)

    try {
      await apiFetch(`/api/agents/${encodeURIComponent(objectId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, lensSystemPrompt: nextPrompt }),
      })
      onVoicePromptSaved(nextPrompt)
      setSaveStatus("saved")
      setSaveMessage("Saved")
      setEditing(false)
    } catch (err: unknown) {
      const message =
        typeof (err as { data?: { error?: string } })?.data?.error === "string"
          ? (err as { data: { error: string } }).data.error
          : "Save failed"
      setSaveStatus("error")
      setSaveMessage(message)
    }
  }

  const displayContent = content.trim() || placeholder
  const isPlaceholder = !content.trim()

  return (
    <div
      className="rounded-lg border overflow-hidden mb-3"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        style={{ background: "hsl(var(--theme-surface-elevated) / 0.12)" }}
      >
        <span
          className="text-[13px] font-semibold"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {label}
        </span>
        <span className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div className="px-3 py-3 border-t" style={{ borderColor: "hsl(var(--theme-border-soft) / 0.35)" }}>
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="w-full resize-y rounded-md border px-3 py-2.5 font-mono text-[14px] leading-relaxed bg-transparent outline-none"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                color: "hsl(var(--theme-ink-primary))",
                minHeight: "9rem",
              }}
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(content)
                setEditing(true)
              }}
              className="w-full text-left rounded-md border px-3 py-2.5 font-mono text-[14px] leading-relaxed"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                color: isPlaceholder
                  ? "hsl(var(--theme-ink-tertiary))"
                  : "hsl(var(--theme-ink-secondary))",
                background: "hsl(var(--theme-surface-elevated) / 0.15)",
              }}
            >
              {displayContent}
            </button>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
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
            </div>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveStatus === "saving"}
              className="shrink-0 rounded-md px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
              style={{
                background: "hsl(var(--theme-accent-primary, var(--theme-ink-primary)))",
                color: "hsl(var(--theme-surface-base, 0 0% 100%))",
              }}
            >
              {saveStatus === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AgentTrainingPresence({
  objectId,
  domainId,
  voicePrompt,
  identity,
  onVoicePromptSaved,
}: AgentTrainingPresenceProps) {
  const sections = React.useMemo(
    () => parseVoicePromptSections(voicePrompt),
    [voicePrompt],
  )

  return (
    <motion.div
      className="flex flex-col h-full min-h-0"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      data-cover-mode="training"
    >
      <TrainingIdentityHeader {...identity} />
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4">
        <p
          className="text-[12px] mb-4 leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Structured system prompt — saved per section to this agent&apos;s voice prompt.
        </p>
        {VOICE_PROMPT_SECTIONS.map((def) => (
          <TrainingSectionPanel
            key={def.key}
            sectionKey={def.key}
            label={def.label}
            placeholder={def.placeholder}
            content={sections[def.key]}
            voicePrompt={voicePrompt}
            objectId={objectId}
            domainId={domainId}
            onVoicePromptSaved={onVoicePromptSaved}
          />
        ))}
      </div>
    </motion.div>
  )
}
