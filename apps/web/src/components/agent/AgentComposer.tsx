"use client"

/**
 * AgentComposer
 *
 * Cursor-style layout:
 * - Toolbar (top): ∞ Kip Domain | attach | send — all in one row, within container
 * - Attachment bar (below toolbar): shows attached files when present
 * - Text input (full width): the chat box, no elements splitting it
 *
 * Act, Kip, kip-old are rendered below the composer by the Margin.
 */

import * as React from "react"
import { PaperAirplaneIcon, PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { useAuth } from "../../context/AuthContext"
import { apiFetch } from "../../lib/api"

const SURFACE = {
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
  inkTertiary: "var(--theme-ink-tertiary)",
  border: "var(--theme-border-soft)",
  surfacePaper: "hsl(var(--theme-surface-paper) / 0.95)",
  /** Toolbar: distinct but subtle, sits above the input */
  toolbarBg: "hsl(var(--theme-surface-paper) / 0.82)",
  /** Message area: clearly a typing surface — more opaque than toolbar */
  inputBg: "hsl(var(--theme-surface-paper) / 0.98)",
  /** Container: slightly elevated from the bar */
  containerBorder: "hsl(var(--theme-ink-primary) / 0.12)",
}

export type PendingAttachment = {
  id: string
  name: string
  url: string
  type: "text" | "image" | "file"
}

/** Attachment sent to the agent API (for vision and context) */
export type AgentAttachment = {
  url: string
  name: string
  type: "image" | "file"
}

export interface AgentComposerProps {
  agentName: string
  agentId: string | null
  domainId: string | null
  keeperId?: string | null
  journeyId?: string | null
  dialogueMode: "domain" | "debug"
  onModeChange?: (mode: "domain" | "debug") => void
  lensName?: string | null
  modelName?: string | null
  onOpenCockpit?: () => void
  inputValue: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent, options: { content: string; attachments?: AgentAttachment[] }) => void
  onFileAttach?: (text: string) => void
  isSending: boolean
  activeSessionId: string | null
  disabled?: boolean
  feedbackSlot?: React.ReactNode
}

const MIN_ROWS = 2
const MAX_ROWS = 6

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]

export const AgentComposer: React.FC<AgentComposerProps> = ({
  agentName,
  domainId,
  keeperId,
  journeyId,
  dialogueMode,
  onModeChange,
  onFileAttach,
  inputValue,
  onInputChange,
  onSubmit,
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
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([])

  const TEXT_TYPES = ["text/plain", "text/markdown", "text/csv", "application/json"]
  const TEXT_EXT = /\.(txt|md|json|csv)$/i
  const isTextFile = (file: File) =>
    TEXT_TYPES.includes(file.type) || TEXT_EXT.test(file.name) || file.type.startsWith("text/")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      e.target.value = ""
      return
    }

    if (isTextFile(file)) {
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        if (text && onFileAttach) {
          onFileAttach(text)
        }
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
      const parts = ["uploads", user.id, "agent", activeSessionId || "temp"]
      if (domainId) parts.push("domain", domainId)
      if (keeperId) parts.push("keeper", keeperId)
      if (journeyId) parts.push("journey", journeyId)
      parts.push(`${Date.now()}-${safeName}`)
      const key = parts.join("/")

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

      const attachmentType = IMAGE_TYPES.includes(file.type) ? "image" : "file"
      setAttachments((prev) => [
        ...prev,
        { id: `${Date.now()}-${file.name}`, name: file.name, url: res.data!.url!, type: attachmentType },
      ])
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed. Sign in and try again.")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const agentAttachments: AgentAttachment[] = attachments
      .filter((a) => a.type !== "text")
      .map((a) => ({ url: a.url, name: a.name, type: a.type as "image" | "file" }))
    const content = inputValue.trim()
    const hasContent = content.length > 0 || agentAttachments.length > 0
    if (!hasContent || !activeSessionId || isSending) return
    setAttachments([])
    onSubmit(e, { content, attachments: agentAttachments })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (formRef.current && (inputValue.trim() || attachments.length > 0) && activeSessionId && !isSending) {
        formRef.current.requestSubmit()
      }
    }
  }

  // Auto-resize textarea
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

  const canSend = (inputValue.trim() || attachments.length > 0) && activeSessionId && !isSending && !disabled

  return (
    <div className="flex w-full flex-col gap-1">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex w-full flex-col rounded-xl border-2 transition-colors focus-within:ring-2 focus-within:ring-offset-1"
        style={{
          borderColor: SURFACE.containerBorder,
          backgroundColor: SURFACE.surfacePaper,
          boxShadow: "0 1px 3px hsl(var(--theme-ink-primary) / 0.06)",
          ["--tw-ring-color" as string]: "hsl(var(--theme-ink-primary) / 0.2)",
        }}
      >
        {/* Toolbar: Kip Domain (left) | attach | send (right) */}
        <div
          className="flex items-center justify-between gap-2 rounded-t-[10px] border-b px-3 py-2"
          style={{ borderColor: SURFACE.border, backgroundColor: SURFACE.toolbarBg }}
        >
          <div className="flex shrink-0 items-center">
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
              style={{ backgroundColor: "hsl(var(--theme-surface-page) / 0.6)" }}
            >
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
                  className="ml-1 cursor-pointer border-0 bg-transparent p-0 text-xs font-medium focus:outline-none focus:ring-0 disabled:opacity-50"
                  style={{ color: SURFACE.inkSecondary }}
                  aria-label="Agent mode"
                >
                  <option value="domain">Domain</option>
                  <option value="debug">Debug</option>
                </select>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
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
              disabled={!canSend}
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
        </div>

        {/* Attachment bar: shows attached files above the input */}
        {attachments.length > 0 && (
          <div
            className="flex flex-col gap-1.5 px-3 py-2"
            style={{ borderBottom: `1px solid ${SURFACE.border}`, backgroundColor: SURFACE.toolbarBg }}
          >
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                  style={{ borderColor: SURFACE.border, color: SURFACE.inkPrimary }}
                >
                  <PaperClipIcon className="h-3.5 w-3.5 shrink-0" style={{ color: SURFACE.inkSecondary }} />
                  <span className="max-w-[120px] truncate">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    className="rounded p-0.5 transition-colors hover:bg-black/10"
                    aria-label={`Remove ${a.name}`}
                  >
                    <XMarkIcon className="h-3.5 w-3.5" style={{ color: SURFACE.inkSecondary }} />
                  </button>
                </div>
              ))}
            </div>
            {/* Vision unavailability notice — shown when any image is attached */}
            {attachments.some((a) => a.type === "image") && (
              <p
                className="text-[11px] leading-snug px-1"
                style={{
                  color: "hsl(38 80% 35%)",
                  background: "hsl(48 90% 94%)",
                  border: "1px solid hsl(38 60% 80%)",
                  borderRadius: "6px",
                  padding: "5px 8px",
                }}
              >
                Kip can&apos;t currently see attached images — describe what you&apos;re seeing for best results.
              </p>
            )}
          </div>
        )}

        {/* Full-width text input — clearly a place to type */}
        <div
          className="w-full rounded-b-[10px] px-3 py-2"
          style={{ backgroundColor: SURFACE.inputBg }}
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={!activeSessionId || isSending || disabled}
            rows={MIN_ROWS}
            className="w-full min-h-[44px] max-h-[120px] resize-none overflow-y-auto rounded-md border text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{
              color: SURFACE.inkPrimary,
              backgroundColor: "hsl(var(--theme-surface-paper))",
              borderColor: SURFACE.border,
              ["--tw-ring-color" as string]: "hsl(var(--theme-ink-primary) / 0.25)",
            }}
          />
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
