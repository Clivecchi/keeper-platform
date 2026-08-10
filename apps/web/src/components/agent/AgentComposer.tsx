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
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  MicrophoneIcon,
  XMarkIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline"
import type { TalkModeState } from "../../hooks/useTalkMode"
import { useAuth } from "../../context/AuthContext"
import {
  buildComposerSubmitContent,
  isPastedSupportingDoc,
  pastedDocumentTitle,
  pastedPreview,
  shouldCapturePaste,
} from "./composerSupporting"
import { formatDialogueAsMarkdown } from "./helpers"
import type { AgentDialogueMessage } from "./types"
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

/** Pasted supporting doc summary for the Dialog transcript (not sent as multimodal). */
export type ComposerSupportingDoc = {
  name: string
  preview?: string
}

/** Payload passed to onSubmit from AgentComposer. */
export type ComposerSubmitPayload = {
  /** Full message for the agent API (includes supporting context). */
  content: string
  /** Shorter label for the Dialog transcript when supporting docs are attached. */
  displayContent?: string
  attachments?: AgentAttachment[]
  /** Pasted tiles to keep visible on the sent user message. */
  supportingDocs?: ComposerSupportingDoc[]
}

/** Attachment sent to the agent API (for vision and context) */
export type AgentAttachment = {
  url: string
  name: string
  type: "image" | "file"
}

export type ComposerAgentChip = {
  slug: string
  label: string
}

export interface AgentComposerProps {
  agentName: string
  /** Invoked collaborators on the composer toolbar (lead agent, etc.) — each chip has an X to return to the footer bar. */
  composerAgents?: ReadonlyArray<ComposerAgentChip>
  onRemoveComposerAgent?: (slug: string) => void
  /** When false, hide the ∞ agent badge — agent identity lives in the footer Agents bar only. */
  showToolbarAgentIdentity?: boolean
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
  /**
   * Session id when a Dialog already exists. Optional for typing/send —
   * Universal Boards create the session on first send (`useAgentDialog`).
   * Kept on the prop surface so callers can pass it without a second composer API.
   */
  activeSessionId: string | null
  disabled?: boolean
  /** When false, Enter inserts a new line; send only via the send button. Default true. */
  submitOnEnter?: boolean
  /** Notifies parent when the composer textarea gains or loses focus. */
  onInputFocusChange?: (focused: boolean) => void
  /** Expands composer input for mobile staged layout. */
  composerSize?: "default" | "mobile-expanded" | "mobile-compact"
  /** Override default placeholder text. */
  inputPlaceholder?: string
  feedbackSlot?: React.ReactNode
  /** Talk mode — mic control; transcript lands in composer for user confirm before send. */
  talkMode?: boolean
  talkState?: TalkModeState
  talkSupported?: boolean
  onTalkStart?: () => void
  onTalkStop?: () => void
  talkError?: string | null
  /**
   * Loaded Dialog/session transcript — used by the markdown export control.
   * When omitted or empty, the markdown icon stays disabled.
   */
  dialogueMessages?: ReadonlyArray<AgentDialogueMessage>
  /** Display name for the current user in markdown export (default "You"). */
  userName?: string
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
  composerAgents,
  onRemoveComposerAgent,
  showToolbarAgentIdentity = true,
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
  activeSessionId: _activeSessionId,
  disabled = false,
  feedbackSlot,
  submitOnEnter = true,
  onInputFocusChange,
  composerSize = "default",
  inputPlaceholder,
  talkMode = false,
  talkState = "idle",
  talkSupported = false,
  onTalkStart,
  onTalkStop,
  talkError,
  dialogueMessages,
  userName,
}) => {
  const fileInputId = React.useId()
  const formRef = React.useRef<HTMLFormElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const { user } = useAuth()
  const [isUploading, setIsUploading] = React.useState(false)
  const [markdownOpen, setMarkdownOpen] = React.useState(false)
  const [markdownCopied, setMarkdownCopied] = React.useState(false)
  const [internalAttachments, setInternalAttachments] = React.useState<PendingAttachment[]>([])
  const attachments = controlledAttachments ?? internalAttachments
  const setAttachments = onAttachmentsChange ?? setInternalAttachments
  const pastedSupporting = attachments.filter(isPastedSupportingDoc)
  const uploadAttachments = attachments.filter((a) => !isPastedSupportingDoc(a))
  const showAttachmentBar = attachmentDisplay === "composer" && uploadAttachments.length > 0
  /** Thinking-space boards show pasted docs in Broadcast Strip, not above the textarea. */
  const showSupportingDocs =
    attachmentDisplay === "composer" && pastedSupporting.length > 0

  /** Loaded Dialog/session transcript as markdown (not the draft composer text). */
  const dialogueMarkdown = React.useMemo(
    () =>
      formatDialogueAsMarkdown(dialogueMessages ?? [], {
        agentName,
        userName,
      }),
    [dialogueMessages, agentName, userName],
  )

  const canOpenMarkdown = dialogueMarkdown.trim().length > 0

  const handleCopyMarkdown = React.useCallback(async () => {
    const text = dialogueMarkdown.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setMarkdownCopied(true)
      window.setTimeout(() => setMarkdownCopied(false), 2000)
    } catch {
      alert("Could not copy to clipboard.")
    }
  }, [dialogueMarkdown])

  React.useEffect(() => {
    if (!markdownOpen) {
      setMarkdownCopied(false)
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMarkdownOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [markdownOpen])

  const TEXT_TYPES = ["text/plain", "text/markdown", "text/csv", "application/json"]
  const TEXT_EXT = /\.(txt|md|json|csv|pdf)$/i
  const isLibraryFile = (file: File) =>
    IMAGE_TYPES.includes(file.type) ||
    TEXT_TYPES.includes(file.type) ||
    TEXT_EXT.test(file.name) ||
    file.type.startsWith("text/") ||
    file.type === "application/pdf"

  const stageFileUpload = onComposerFileUpload ?? onLibraryFileUpload

  const stageUploadFile = React.useCallback(
    async (file: File) => {
      if (!stageFileUpload) return
      if (!user?.id) {
        alert("Please sign in to attach files.")
        return
      }
      if (!domainId) {
        alert("Open a domain board to attach files.")
        return
      }
      const maxSize = 25 * 1024 * 1024
      if (file.size > maxSize) {
        alert("File too large. Maximum size is 25MB.")
        return
      }
      if (!isLibraryFile(file)) {
        alert("Unsupported file type. Use images, PDF, Markdown, text, JSON, or CSV.")
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
      }
    },
    [stageFileUpload, user?.id, domainId, onUploadingChange, setAttachments],
  )

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    await stageUploadFile(file)
  }

  /** Screen capture → same attachment path as Paperclip (new tool group before attach). */
  const handleScreenCapture = React.useCallback(async () => {
    if (!stageFileUpload || isSending || disabled || isUploading) return
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      alert("Screen capture is not supported in this browser.")
      return
    }
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as MediaTrackConstraints,
        audio: false,
      })
      const track = stream.getVideoTracks()[0]
      if (!track) throw new Error("No video track from screen capture.")
      const video = document.createElement("video")
      video.playsInline = true
      video.muted = true
      video.srcObject = stream
      await video.play()
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve()
          return
        }
        video.onloadeddata = () => resolve()
      })
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not capture frame.")
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      track.stop()
      stream.getTracks().forEach((t) => t.stop())
      stream = null
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Capture failed"))),
          "image/png",
        )
      })
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const file = new File([blob], `screen-capture-${stamp}.png`, { type: "image/png" })
      await stageUploadFile(file)
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") return
      alert(err instanceof Error ? err.message : "Screen capture failed.")
    } finally {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [stageFileUpload, isSending, disabled, isUploading, stageUploadFile])

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
        name: pastedDocumentTitle(text),
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
    const supportingDocs: ComposerSupportingDoc[] = pastedSupporting.map((doc) => ({
      name: doc.name,
      preview: doc.pastedContent ? pastedPreview(doc.pastedContent, 120) : undefined,
    }))
    const { content, displayContent } = buildComposerSubmitContent(inputValue, attachments)
    const hasContent = content.length > 0 || agentAttachments.length > 0
    // Session may be null on Universal Boards (create deferred to first send in useAgentDialog).
    if (!hasContent || isSending || disabled) return
    // Controlled attachment state (Dialog Thinking Space) clears after parent send completes.
    if (!onAttachmentsChange) {
      setAttachments([])
    }
    onSubmit(e, {
      content,
      displayContent,
      attachments: agentAttachments,
      supportingDocs: supportingDocs.length ? supportingDocs : undefined,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!submitOnEnter) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      // Enter always sends prompt + staged files together; attachment-only sends use the button.
      const hasPrompt = inputValue.trim().length > 0
      if (formRef.current && hasPrompt && !isSending && !disabled) {
        formRef.current.requestSubmit()
      }
    }
  }

  // Auto-resize textarea (respect mobile-staged compact/expanded floors)
  React.useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    if (composerSize === "mobile-compact") {
      ta.style.height = ""
      return
    }
    ta.style.height = "auto"
    const lineHeight = 20
    const minRows = composerSize === "mobile-expanded" ? 8 : MIN_ROWS
    const newHeight = Math.min(
      MAX_ROWS * lineHeight,
      Math.max(minRows * lineHeight, ta.scrollHeight),
    )
    ta.style.height = `${newHeight}px`
  }, [inputValue, composerSize])

  const placeholder = disabled
    ? "Preparing conversation…"
    : inputPlaceholder?.trim()
      ? inputPlaceholder.trim()
      : submitOnEnter
        ? "Share your thoughts… (Shift+Enter for new line)"
        : "Share your thoughts…"

  // Session id is optional: Universal Boards create the Dialog on first send.
  const canSend =
    (inputValue.trim() || attachments.length > 0) && !isSending && !disabled

  const showTalkMic = talkMode && talkSupported
  const showTalkUnsupported = talkMode && !talkSupported
  const isTalkListening = talkState === "listening"
  const isTalkBusy = talkState === "listening" || talkState === "transcribing"

  const handleTalkClick = () => {
    if (!talkSupported || disabled || isSending) return
    if (isTalkListening) onTalkStop?.()
    else onTalkStart?.()
  }

  const talkMicTitle = isTalkListening
    ? "Stop listening"
    : talkState === "transcribing"
      ? "Transcribing…"
      : "Talk — speak to fill the composer"

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
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {showToolbarAgentIdentity && composerAgents && composerAgents.length > 0 ? (
              composerAgents.map(({ slug, label }) => (
                <div
                  key={slug}
                  className="flex items-center gap-1 rounded-lg pl-2.5 pr-1 py-1"
                  style={{ backgroundColor: "hsl(var(--theme-surface-page) / 0.6)" }}
                >
                  <span className="text-xs" aria-hidden style={{ color: SURFACE.inkSecondary }}>
                    ∞
                  </span>
                  <span className="text-xs font-medium" style={{ color: SURFACE.inkPrimary }}>
                    {label}
                  </span>
                  {onRemoveComposerAgent ? (
                    <button
                      type="button"
                      onClick={() => onRemoveComposerAgent(slug)}
                      className="flex h-5 w-5 items-center justify-center rounded-md transition-colors hover:bg-black/5"
                      style={{ color: SURFACE.inkTertiary }}
                      aria-label={`Remove ${label} from composer`}
                      title={`Remove ${label} — returns to Agents bar`}
                    >
                      <XMarkIcon className="h-3 w-3" strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
              ))
            ) : showToolbarAgentIdentity ? (
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
              </div>
            ) : null}
            {onModeChange && (
              <select
                value={dialogueMode}
                onChange={(e) => onModeChange(e.target.value as "domain" | "debug")}
                disabled={disabled}
                className="cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-xs font-medium focus:outline-none focus:ring-0 disabled:opacity-50"
                style={{ color: SURFACE.inkSecondary }}
                aria-label="Agent mode"
              >
                <option value="domain">Domain</option>
                <option value="debug">Debug</option>
              </select>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {showTalkMic ? (
              <button
                type="button"
                onClick={handleTalkClick}
                disabled={disabled || isSending || talkState === "transcribing"}
                className={[
                  "keeper-composer-icon-btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-40",
                  isTalkListening ? "keeper-composer-talk--active" : "",
                ].join(" ")}
                style={
                  isTalkListening
                    ? { color: "hsl(var(--theme-focus-ring))" }
                    : undefined
                }
                title={talkMicTitle}
                aria-label={talkMicTitle}
                aria-pressed={isTalkListening}
              >
                <MicrophoneIcon className="h-4 w-4" />
              </button>
            ) : null}
            {showTalkUnsupported ? (
              <span
                className="keeper-composer-icon-btn flex h-8 w-8 items-center justify-center rounded-md opacity-40"
                title="Speech recognition is not supported in this browser"
              >
                <MicrophoneIcon className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
            {/* Tools cluster — capture ‖ markdown ‖ attach — visual break from send */}
            {stageFileUpload ? (
              <button
                type="button"
                onClick={() => void handleScreenCapture()}
                disabled={isSending || disabled || isUploading}
                className="keeper-composer-icon-btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-40"
                title="Capture screen"
                aria-label="Capture screen"
              >
                <ComputerDesktopIcon className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => canOpenMarkdown && setMarkdownOpen(true)}
              disabled={!canOpenMarkdown || disabled}
              className="keeper-composer-icon-btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-40"
              title="Copy dialog as markdown"
              aria-label="Copy dialog as markdown"
            >
              <DocumentTextIcon className="h-4 w-4" />
            </button>
            {stageFileUpload ? (
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
                  className="keeper-composer-icon-btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-40"
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
            ) : null}
            <span
              aria-hidden
              className="mx-0.5 h-4 w-px shrink-0"
              style={{ background: "hsl(var(--theme-border-soft) / 0.65)" }}
            />
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
            {uploadAttachments.some((a) => a.type === "image") && (
              <p
                className="text-[11px] leading-snug px-1"
                style={{
                  color: SURFACE.inkSecondary,
                  background: "hsl(var(--theme-surface-page) / 0.5)",
                  border: `1px solid ${SURFACE.border}`,
                  borderRadius: "6px",
                  padding: "5px 8px",
                }}
              >
                Image attached — add a short note about what you want the agent to notice, then send.
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
            disabled={isSending || disabled}
            rows={
              composerSize === "mobile-expanded"
                ? 8
                : composerSize === "mobile-compact"
                  ? 1
                  : MIN_ROWS
            }
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
      {talkMode && (isTalkBusy || talkError) ? (
        <div
          className="flex items-center gap-2 px-1 text-xs"
          style={{ color: talkError ? "hsl(0 65% 45%)" : SURFACE.inkSecondary }}
          aria-live="polite"
        >
          {talkError
            ? talkError
            : talkState === "listening"
              ? "Listening… tap mic when done, then send."
              : "Transcribing…"}
        </div>
      ) : null}

      {markdownOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="composer-markdown-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog markdown"
            onClick={() => setMarkdownOpen(false)}
          />
          <div
            className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-xl"
            style={{
              backgroundColor: "hsl(var(--theme-surface-panel))",
              borderColor: "hsl(var(--theme-border-soft) / 0.55)",
              maxHeight: "min(70vh, 560px)",
            }}
          >
            <div
              className="flex items-center justify-between gap-3 border-b px-4 py-3"
              style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
            >
              <h2
                id="composer-markdown-title"
                className="text-sm font-medium"
                style={{ color: SURFACE.inkPrimary }}
              >
                Dialog markdown
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleCopyMarkdown()}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: "hsl(var(--theme-focus-ring))",
                    color: "hsl(0 0% 98%)",
                  }}
                  title="Copy markdown"
                  aria-label="Copy markdown"
                >
                  {markdownCopied ? (
                    <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                  )}
                  {markdownCopied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setMarkdownOpen(false)}
                  className="keeper-composer-icon-btn flex h-8 w-8 items-center justify-center rounded-md"
                  aria-label="Close"
                  title="Close"
                >
                  <XMarkIcon className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
            <pre
              className="overflow-auto px-4 py-3 text-xs leading-5 whitespace-pre-wrap break-words font-mono"
              style={{
                color: SURFACE.inkPrimary,
                backgroundColor: "hsl(var(--theme-surface-elevated) / 0.55)",
              }}
            >
              {dialogueMarkdown.trim()}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AgentComposer
