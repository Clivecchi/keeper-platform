"use client"

/**
 * AgentComposer
 *
 * Cursor-style chat input with integrated tool kit:
 * - Agent/mode dropdown (left)
 * - Config dropdown (model, lens, Open Cockpit)
 * - Text input + attach + submit (right)
 * - Feedback area below (errors, hints)
 *
 * Attachments: text files are inlined; images, video, docs are uploaded to
 * blob storage and referenced by URL (keeper-library style).
 */

import * as React from "react"
import { PaperAirplaneIcon, PaperClipIcon } from "@heroicons/react/24/outline"
import { useAuth } from "../../context/AuthContext"
import { apiFetch } from "../../lib/api"

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
  const { user } = useAuth()
  const [isUploading, setIsUploading] = React.useState(false)

  const TEXT_TYPES = ["text/plain", "text/markdown", "text/csv", "application/json"]
  const TEXT_EXT = /\.(txt|md|json|csv)$/i
  const isTextFile = (file: File) =>
    TEXT_TYPES.includes(file.type) || TEXT_EXT.test(file.name) || file.type.startsWith("text/")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onFileAttach) {
      e.target.value = ""
      return
    }

    if (isTextFile(file)) {
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        if (text) onFileAttach(text)
      }
      reader.readAsText(file)
      e.target.value = ""
      return
    }

    if (!user?.id) {
      alert("Please sign in to attach images, video, or documents.")
      e.target.value = ""
      return
    }

    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      alert("File too large. Maximum size is 25MB.")
      e.target.value = ""
      return
    }

    setIsUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64Data = result.includes(",") ? result.split(",")[1] : result
          resolve(base64Data || "")
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const ext = file.name.split(".").pop() || "bin"
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80)
      const key = `uploads/${user.id}/agent/${activeSessionId || "temp"}/${Date.now()}-${safeName}`

      const res = (await apiFetch("/api/uploads/direct", {
        method: "POST",
        body: JSON.stringify({
          key,
          file: base64,
          contentType: file.type || "application/octet-stream",
        }),
      })) as { success?: boolean; data?: { url?: string }; error?: string }

      if (!res?.success || !res?.data?.url) {
        throw new Error(res?.error || "Upload failed")
      }

      const ref = `\n\n[Attached: ${file.name}](${res.data.url})\n\n`
      onFileAttach(ref)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed. Sign in and try again.")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
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
    <div className="space-y-1.5">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="flex items-end gap-0 rounded-xl border px-2 py-1.5"
        style={{ borderColor: SURFACE.border, backgroundColor: SURFACE.surfacePaper }}
      >
        {/* Agent / mode dropdown */}
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-sm" aria-hidden style={{ color: SURFACE.inkSecondary }}>
            ∞
          </span>
          <span className="text-xs font-medium" style={{ color: SURFACE.inkPrimary }}>
            {agentName}
          </span>
          <select
            value={dialogueMode}
            onChange={(e) => onModeChange?.(e.target.value as "domain" | "debug")}
            disabled={disabled || !onModeChange}
            className="rounded border-0 bg-transparent px-1.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-0 disabled:opacity-50"
            style={{ color: SURFACE.inkPrimary }}
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
              className="rounded border-0 bg-transparent px-1.5 py-0.5 text-xs focus:outline-none focus:ring-0 disabled:opacity-50"
              style={{ color: SURFACE.inkSecondary }}
              aria-label="Model and config"
            >
              <option value={configLabel}>{configLabel}</option>
              <option value="cockpit">Open Cockpit</option>
            </select>
          ) : (
            <span className="px-1.5 py-0.5 text-xs" style={{ color: SURFACE.inkSecondary }}>
              {configLabel}
            </span>
          )}
        </div>

        {/* Divider */}
        <div
          className="mx-1 h-4 w-px shrink-0 self-center"
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
          className="min-h-[36px] max-h-24 flex-1 resize-y bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-0"
          style={{ color: SURFACE.inkPrimary }}
        />

        {/* Attach */}
        {onFileAttach && (
          <>
            <input
              type="file"
              id={fileInputId}
              className="hidden"
              accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json,image/*,video/*,.pdf,.doc,.docx,application/pdf"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => document.getElementById(fileInputId)?.click()}
              disabled={!activeSessionId || isSending || disabled || isUploading}
              className="flex shrink-0 cursor-pointer items-center justify-center rounded p-1.5 transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:opacity-50"
              style={{ color: SURFACE.inkSecondary }}
              title="Attach file (text, images, video, docs)"
              aria-label="Attach file"
            >
              {isUploading ? (
                <span className="text-[10px] font-medium">…</span>
              ) : (
                <PaperClipIcon className="h-4 w-4" />
              )}
            </button>
          </>
        )}

        {/* Submit - inside toolbar */}
        <button
          type="submit"
          disabled={!inputValue.trim() || !activeSessionId || isSending || disabled}
          className="flex shrink-0 items-center justify-center rounded-lg p-2 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: SURFACE.inkPrimary, color: "white" }}
          aria-label="Send message"
        >
          {isSending ? (
            <span className="text-xs font-medium">Sending…</span>
          ) : (
            <PaperAirplaneIcon className="h-4 w-4" />
          )}
        </button>
      </form>

      {/* Feedback area */}
      {feedbackSlot && <div className="flex items-center gap-2 px-1">{feedbackSlot}</div>}
    </div>
  )
}

export default AgentComposer
