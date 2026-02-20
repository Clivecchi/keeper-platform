"use client"

/**
 * AgentComposer
 *
 * Cursor-style chat input: input-first, tools neat on the right, grows with text.
 * - Compact agent pill (left)
 * - Flexible textarea (center, grows with content)
 * - Attach + Send (right)
 *
 * Attachments: text files inlined; images, video, docs uploaded to blob storage.
 */

import * as React from "react"
import { PaperAirplaneIcon, PaperClipIcon } from "@heroicons/react/24/outline"
import { useAuth } from "../../context/AuthContext"
import { apiFetch } from "../../lib/api"

const SURFACE = {
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
  inkTertiary: "var(--theme-ink-tertiary)",
  border: "var(--theme-border-soft)",
  surfacePaper: "hsl(var(--theme-surface-paper) / 0.95)",
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

const MIN_ROWS = 1
const MAX_ROWS = 6

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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
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

  // Auto-resize textarea to fit content
  React.useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    const lineHeight = 20
    const newHeight = Math.min(MAX_ROWS * lineHeight, Math.max(MIN_ROWS * lineHeight, ta.scrollHeight))
    ta.style.height = `${newHeight}px`
  }, [inputValue])

  const placeholder = activeSessionId
    ? "Share your thoughts… (Shift+Enter for new line)"
    : "Create a session to start chatting"

  return (
    <div className="flex flex-col gap-1">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="flex min-h-[44px] items-end gap-2 rounded-xl border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-offset-1"
        style={{
          borderColor: SURFACE.border,
          backgroundColor: SURFACE.surfacePaper,
          ["--tw-ring-color" as string]: "hsl(var(--theme-ink-primary) / 0.2)",
        }}
      >
        {/* Agent pill - compact left */}
        <div className="flex shrink-0 items-center">
          <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ backgroundColor: "hsl(var(--theme-surface-page) / 0.5)" }}>
            <span className="text-xs" aria-hidden style={{ color: SURFACE.inkSecondary }}>
              ∞
            </span>
            <span className="text-xs font-medium" style={{ color: SURFACE.inkPrimary }}>
              {agentName}
            </span>
            {onModeChange && (
              <select
                value={dialogueMode}
                onChange={(e) => onModeChange(e.target.value as "domain" | "debug")}
                disabled={disabled}
                className="ml-0.5 cursor-pointer border-0 bg-transparent p-0 text-xs font-medium focus:outline-none focus:ring-0 disabled:opacity-50"
                style={{ color: SURFACE.inkSecondary }}
                aria-label="Agent mode"
              >
                <option value="domain">Domain</option>
                <option value="debug">Debug</option>
              </select>
            )}
          </div>
        </div>

        {/* Text input - primary, grows */}
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={!activeSessionId || isSending || disabled}
          rows={MIN_ROWS}
          className="min-h-[28px] max-h-[120px] flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-sm leading-5 focus:outline-none focus:ring-0"
          style={{ color: SURFACE.inkPrimary }}
        />

        {/* Tools - neat on the right */}
        <div className="flex shrink-0 items-center gap-0.5">
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
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40"
                style={{ color: SURFACE.inkSecondary }}
                title="Attach file"
                aria-label="Attach file"
              >
                {isUploading ? (
                  <span className="text-[10px]">…</span>
                ) : (
                  <PaperClipIcon className="h-4 w-4" />
                )}
              </button>
            </>
          )}
          <button
            type="submit"
            disabled={!inputValue.trim() || !activeSessionId || isSending || disabled}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-opacity disabled:opacity-40"
            style={{ backgroundColor: SURFACE.inkPrimary, color: "white" }}
            aria-label="Send"
          >
            {isSending ? (
              <span className="text-[10px] font-medium">…</span>
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </form>

      {feedbackSlot && (
        <div className="flex items-center gap-2 px-1 text-xs" style={{ color: SURFACE.inkSecondary }}>
          {feedbackSlot}
        </div>
      )}
    </div>
  )
}

export default AgentComposer
