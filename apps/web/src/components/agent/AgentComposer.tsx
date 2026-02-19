"use client"

/**
 * AgentComposer
 *
 * Cursor-style chat input with integrated tool kit:
 * - Agent/mode dropdown (left)
 * - Config dropdown (model, lens, Open Cockpit)
 * - Text input + attach + submit (right)
 * - Feedback area below (errors, hints)
 */

import * as React from "react"
import { PaperAirplaneIcon, PaperClipIcon } from "@heroicons/react/24/outline"

const SURFACE = {
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
  border: "var(--theme-border-soft)",
  surfacePaper: "hsl(var(--theme-surface-paper) / 0.9)",
}

export interface AgentComposerProps {
  agentName: string
  agentId: string | null
  domainId: string | null
  dialogueMode: "domain" | "debug"
  onModeChange?: (mode: "domain" | "debug") => void
  lensName?: string | null
  modelName?: string | null
  onOpenCockpit?: () => void
  inputValue: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onFileAttach?: (text: string) => void
  isSending: boolean
  activeSessionId: string | null
  disabled?: boolean
  feedbackSlot?: React.ReactNode
}

export const AgentComposer: React.FC<AgentComposerProps> = ({
  agentName,
  dialogueMode,
  onModeChange,
  lensName,
  modelName,
  onOpenCockpit,
  inputValue,
  onInputChange,
  onSubmit,
  onFileAttach,
  isSending,
  activeSessionId,
  disabled = false,
  feedbackSlot,
}) => {
  const fileInputId = React.useId()
  const formRef = React.useRef<HTMLFormElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onFileAttach) return
    const allowedTypes = ["text/plain", "text/markdown", "text/csv", "application/json"]
    const allowedExt = /\.(txt|md|json|csv)$/i
    const isTextFile =
      allowedTypes.includes(file.type) ||
      allowedExt.test(file.name) ||
      file.type.startsWith("text/")
    if (!isTextFile) {
      alert(
        "Please attach text files only (.txt, .md, .json, .csv). Images and other binary files are not supported—they would appear as garbled text."
      )
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      if (text) onFileAttach(text)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (formRef.current && inputValue.trim() && activeSessionId && !isSending) {
        formRef.current.requestSubmit()
      }
    }
  }

  const configLabel = modelName || lensName || "Config"
  const [configSelectValue, setConfigSelectValue] = React.useState(configLabel)

  React.useEffect(() => {
    setConfigSelectValue(configLabel)
  }, [configLabel])

  const handleConfigSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (v === "cockpit" && onOpenCockpit) {
      onOpenCockpit()
      setConfigSelectValue(configLabel)
    }
  }

  return (
    <div className="space-y-2">
      <form ref={formRef} onSubmit={onSubmit} className="flex gap-2">
        <div
          className="flex flex-1 flex-wrap items-end gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: SURFACE.border, backgroundColor: SURFACE.surfacePaper }}
        >
          {/* Agent / mode dropdown */}
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-base" aria-hidden>
              ∞
            </span>
            <span className="text-sm font-medium" style={{ color: SURFACE.inkPrimary }}>
              {agentName}
            </span>
            <select
              value={dialogueMode}
              onChange={(e) => onModeChange?.(e.target.value as "domain" | "debug")}
              disabled={disabled || !onModeChange}
              className="rounded-lg border bg-transparent px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 disabled:opacity-50"
              style={{
                borderColor: SURFACE.border,
                color: SURFACE.inkPrimary,
              }}
              aria-label="Agent mode"
            >
              <option value="domain">Domain</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          {/* Config dropdown or label */}
          <div className="flex shrink-0 items-center">
            {onOpenCockpit ? (
              <select
                value={configSelectValue}
                onChange={handleConfigSelectChange}
                className="rounded-lg border bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-1 disabled:opacity-50"
                style={{
                  borderColor: SURFACE.border,
                  color: SURFACE.inkSecondary,
                }}
                aria-label="Model and config"
              >
                <option value={configLabel}>{configLabel}</option>
                <option value="cockpit">Open Cockpit</option>
              </select>
            ) : (
              <span className="px-2 py-1.5 text-sm" style={{ color: SURFACE.inkSecondary }}>
                {configLabel}
              </span>
            )}
          </div>

          {/* Divider */}
          <div
            className="h-6 w-px shrink-0"
            style={{ backgroundColor: SURFACE.border }}
            aria-hidden
          />

          {/* Text input */}
          <textarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeSessionId
                ? "Share your thoughts... (Shift+Enter for new line)"
                : "Create a session to start chatting"
            }
            disabled={!activeSessionId || isSending || disabled}
            rows={1}
            className="min-h-[44px] max-h-32 flex-1 resize-y bg-transparent px-1 py-2 text-sm focus:outline-none focus:ring-0"
            style={{ color: SURFACE.inkPrimary }}
          />

          {/* Attach */}
          {onFileAttach && (
            <>
              <input
                type="file"
                id={fileInputId}
                className="hidden"
                accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => document.getElementById(fileInputId)?.click()}
                disabled={!activeSessionId || isSending || disabled}
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-2 transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:opacity-50"
                style={{ color: SURFACE.inkSecondary }}
                title="Attach file (text files)"
                aria-label="Attach file"
              >
                <PaperClipIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!inputValue.trim() || !activeSessionId || isSending || disabled}
          className="inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-3 text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: SURFACE.inkPrimary }}
          aria-label="Send message"
        >
          {isSending ? (
            <span className="text-sm font-semibold">Sending…</span>
          ) : (
            <PaperAirplaneIcon className="h-5 w-5" />
          )}
        </button>
      </form>

      {/* Feedback area */}
      {feedbackSlot && <div className="flex items-center gap-2">{feedbackSlot}</div>}
    </div>
  )
}

export default AgentComposer
