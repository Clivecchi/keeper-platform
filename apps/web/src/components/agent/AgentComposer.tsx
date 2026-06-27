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
import {
  buildComposerSubmitContent,
  isPastedSupportingDoc,
  shouldCapturePaste,
} from "./composerSupporting"
import { SupportingDocumentTile } from "./SupportingDocumentTile"

const SURFACE = {
  inkPrimary: "var(--theme-ink-primary-color)",
  inkSecondary: "var(--theme-ink-secondary-color)",
  inkTertiary: "var(--theme-ink-tertiary-color)",
  border: "var(--theme-border-soft)",
  surfacePaper: "hsl(var(--theme-surface-panel) / 0.55)",
  toolbarBg: "hsl(var(--theme-surface-panel) / 0.4)",
  inputBg: "hsl(var(--theme-surface-elevated) / 0.9)",
  containerBorder: "hsl(var(--theme-border-soft) / 0.35)",
}

/** Blob upload result — stages in Thinking Space; Library item created on send. */
export type ComposerFileUploadResult = {
  url: string
  name: string
}

/** @deprecated Use ComposerFileUploadResult — library is committed on send. */
export type LibraryUploadResult = ComposerFileUploadResult & {
  libraryItemId?: string
}

export type PendingAttachment = {
  id: string
  name: string
  url: string
  type: "text" | "image" | "file"
  /** `upload` = clip/file; `paste` = ephemeral supporting document (not Library). */
  source?: "upload" | "paste"
  /** Full pasted text — in-memory only until send. */
  pastedContent?: string
  /** Set when committed to Library on message send. */
  libraryItemId?: string
}

/** Payload passed to onSubmit from AgentComposer. */
export type ComposerSubmitPayload = {
  /** Full message for the agent API (includes supporting context). */
  content: string
  /** Shorter label for the Dialog transcript when supporting docs are attached. */
  displayContent?: string
  attachments?: AgentAttachment[]
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
  onSubmit: (e: React.FormEvent, options: ComposerSubmitPayload) => void
  /** Stage file for the next message (blob upload only — not Library until send). */
  onComposerFileUpload?: (file: File) => Promise<ComposerFileUploadResult>
  /** @deprecated Prefer onComposerFileUpload */
  onLibraryFileUpload?: (file: File) => Promise<ComposerFileUploadResult>
  /** Controlled pending attachments (Thinking Space). When omitted, composer manages its own list. */
  attachments?: PendingAttachment[]
  onAttachmentsChange?: React.Dispatch<React.SetStateAction<PendingAttachment[]>>
  /** Where to render pending attachment chips. Dialog uses `thinking-space`. */
  attachmentDisplay?: "composer" | "thinking-space"
  onUploadingChange?: (uploading: boolean) => void
  isSending: boolean
  activeSessionId: string | null
  disabled?: boolean
  /** When false, Enter inserts a new line; send only via the send button. Default true. */
  submitOnEnter?: boolean
  /** Notifies parent when the composer textarea gains or loses focus. */
  onInputFocusChange?: (focused: boolean) => void
  /** Expands composer input for mobile staged layout. */
  composerSize?: "default" | "mobile-expanded" | "mobile-compact"
  feedbackSlot?: React.ReactNode
}

const MIN_ROWS = 4
const MAX_ROWS = 10

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]

export function inferAttachmentType(file: File): PendingAttachment["type"] {
  if (IMAGE_TYPES.includes(file.type)) return "image"
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "file"
  if (
    file.type.startsWith("text/")
    || file.type === "application/json"
    || /\.(txt|md|json|csv)$/i.test(file.name)
  ) {
    return "text"
  }
  return "file"
}

export const AgentComposer: React.FC<AgentComposerProps> = ({
  agentName,
  domainId,
  keeperId,
  journeyId,
  dialogueMode,
  onModeChange,
  onComposerFileUpload,
  onLibraryFileUpload,
  attachments: controlledAttachments,
  onAttachmentsChange,
  attachmentDisplay = "composer",
  onUploadingChange,
  inputValue,
  onInputChange,
  onSubmit,
  isSending,
  activeSessionId,
  disabled = false,
  feedbackSlot,
  submitOnEnter = true,
  onInputFocusChange,
  composerSize = "default",
}) => {
  const fileInputId = React.useId()
  const formRef = React.useRef<HTMLFormElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const { user } = useAuth()
  const [isUploading, setIsUploading] = React.useState(false)
  const [internalAttachments, setInternalAttachments] = React.useState<PendingAttachment[]>([])
  const attachments = controlledAttachments ?? internalAttachments
  const setAttachments = onAttachmentsChange ?? setInternalAttachments
  const pastedSupporting = attachments.filter(isPastedSupportingDoc)
  const uploadAttachments = attachments.filter((a) => !isPastedSupportingDoc(a))
  const showAttachmentBar = attachmentDisplay === "composer" && uploadAttachments.length > 0
  const showSupportingDocs = pastedSupporting.length > 0

  const TEXT_TYPES = ["text/plain", "text/markdown", "text/csv", "application/json"]
  const TEXT_EXT = /\.(txt|md|json|csv|pdf)$/i
  const isLibraryFile = (file: File) =>
    IMAGE_TYPES.includes(file.type) ||
    TEXT_TYPES.includes(file.type) ||
    TEXT_EXT.test(file.name) ||
    file.type.startsWith("text/") ||
    file.type === "application/pdf"

  const stageFileUpload = onComposerFileUpload ?? onLibraryFileUpload

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      e.target.value = ""
      return
    }

    if (!stageFileUpload) {
      e.target.value = ""
      return
    }

    if (!user?.id) {
      alert("Please sign in to attach files.")
      e.target.value = ""
      return
    }

    if (!domainId) {
      alert("Open a domain board to attach files.")
      e.target.value = ""
      return
    }

    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      alert("File too large. Maximum size is 25MB.")
      e.target.value = ""
      return
    }

    if (!isLibraryFile(file)) {
      alert("Unsupported file type. Use images, PDF, Markdown, text, JSON, or CSV.")
      e.target.value = ""
      return
    }

    setIsUploading(true)
    onUploadingChange?.(true)
    try {
      const result = await stageFileUpload(file)
      setAttachments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: result.name || file.name,
          url: result.url,
          type: inferAttachmentType(file),
          source: "upload",
        },
      ])
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add file to library.")
    } finally {
      setIsUploading(false)
      onUploadingChange?.(false)
      e.target.value = ""
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text/plain")
    if (!shouldCapturePaste(text)) return

    e.preventDefault()
    setAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "Pasted text",
        url: "",
        type: "text",
        source: "paste",
        pastedContent: text,
      },
    ])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const agentAttachments: AgentAttachment[] = uploadAttachments
      .filter((a) => a.type !== "text")
      .map((a) => ({ url: a.url, name: a.name, type: a.type as "image" | "file" }))
    const { content, displayContent } = buildComposerSubmitContent(inputValue, attachments)
    const hasContent = content.length > 0 || agentAttachments.length > 0
    if (!hasContent || !activeSessionId || isSending) return
    setAttachments([])
    onSubmit(e, { content, displayContent, attachments: agentAttachments })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!submitOnEnter) return
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

  const placeholder = disabled
    ? "Preparing conversation…"
    : activeSessionId
      ? submitOnEnter
        ? "Share your thoughts… (Shift+Enter for new line)"
        : "Share your thoughts…"
      : "Create a session to start chatting"

  const canSend =
    (inputValue.trim() || attachments.length > 0) && activeSessionId && !isSending && !disabled

  return (
    <div className="flex w-full flex-col gap-1">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="keeper-composer-form flex w-full flex-col rounded-xl border transition-colors focus-within:ring-2 focus-within:ring-offset-1"
        style={{
          borderColor: SURFACE.containerBorder,
          backgroundColor: SURFACE.surfacePaper,
          ["--tw-ring-color" as string]: "var(--treatment-color-alpha-20)",
        }}
      >
        {/* Toolbar: Kip Domain (left) | attach | send (right) */}
        <div
          className="keeper-composer-toolbar flex items-center justify-between gap-2 rounded-t-[10px] border-b px-3 py-2"
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
            {stageFileUpload && (
              <>
                <input
                  type="file"
                  id={fileInputId}
                  className="hidden"
                  accept="image/*,.txt,.md,.pdf,.json,.csv,text/plain,text/markdown,application/json,application/pdf"
                  onChange={(event) => void handleFileChange(event)}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById(fileInputId)?.click()}
                  disabled={isSending || disabled || isUploading}
                  className="keeper-composer-icon-btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40"
                  style={{ color: SURFACE.inkTertiary }}
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
              className="keeper-composer-send flex h-8 w-8 items-center justify-center rounded-md transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "hsl(var(--theme-focus-ring))", color: "hsl(0 0% 98%)" }}
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

        {/* Attachment bar — margin / legacy composer only; Dialog uses Thinking Space */}
        {showAttachmentBar && (
          <div
            className="flex flex-col gap-1.5 px-3 py-2"
            style={{ borderBottom: `1px solid ${SURFACE.border}`, backgroundColor: SURFACE.toolbarBg }}
          >
            <div className="flex flex-wrap gap-2">
              {uploadAttachments.map((a) => (
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
            {uploadAttachments.some((a) => a.type === "image") && (
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
          className="keeper-composer-input-wrap w-full rounded-b-[10px] px-3 py-2"
          style={{ backgroundColor: "transparent" }}
        >
          {showSupportingDocs && (
            <div
              className="keeper-composer-supporting-docs mb-2"
              aria-label="Supporting documents for this message"
            >
              {pastedSupporting.map((doc) => (
                <SupportingDocumentTile key={doc.id} document={doc} onRemove={removeAttachment} />
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onPaste={handlePaste}
            onFocus={() => onInputFocusChange?.(true)}
            onBlur={() => onInputFocusChange?.(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={!activeSessionId || isSending || disabled}
            rows={composerSize === "mobile-expanded" ? 8 : MIN_ROWS}
            className={[
              "keeper-composer-input w-full resize-none overflow-y-auto rounded-md border text-sm leading-5 focus:outline-none",
              composerSize === "mobile-expanded"
                ? "min-h-[38vh] max-h-[50vh]"
                : composerSize === "mobile-compact"
                  ? "min-h-[44px] max-h-[56px]"
                  : "min-h-[44px] max-h-[120px]",
            ].join(" ")}
            style={{
              backgroundColor: SURFACE.inputBg,
              borderColor: "hsl(var(--theme-border-soft) / 0.5)",
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
