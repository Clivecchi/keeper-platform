"use client"

/**
 * DialogIngestPresence
 * ====================
 * Chronicle Act: bring writing from outside Keeper into a Dialog-backed Document.
 * Create a new conversation, or attach to the one already in focus.
 * Never a Library upload.
 */

import * as React from "react"
import { ChronicleConfigShell } from "./chronicleConfig/ChronicleConfigShell"
import type { ChronicleSaveStatus } from "./chronicleConfig/types"
import { KipApi } from "../../lib/kipApi"
import { INGEST_MAX_MARKDOWN_CHARS, INGEST_MAX_POINTS } from "@keeper/shared"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { invalidateDialogDocument } from "../realm/dialogDocumentCache"

export type DialogIngestMode = "create" | "attach"

export interface DialogIngestPresenceProps {
  domainId: string
  dialogId?: string | null
  dialogTitle?: string | null
  onClose: () => void
}

const INPUT_CLASS =
  "w-full rounded-md border px-3 py-2 text-[13px] bg-transparent outline-none resize-y"

const INPUT_STYLE = {
  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
} as const

export function DialogIngestPresence({
  domainId,
  dialogId,
  dialogTitle,
  onClose,
}: DialogIngestPresenceProps) {
  const boardCtx = useUniversalBoardOptional()
  const attaching = Boolean(dialogId)
  const [title, setTitle] = React.useState("")
  const [markdown, setMarkdown] = React.useState("")
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [saveStatus, setSaveStatus] = React.useState<ChronicleSaveStatus>("idle")
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null)

  const handleFile = React.useCallback((file: File | null) => {
    if (!file) return
    if (file.size > INGEST_MAX_MARKDOWN_CHARS * 4) {
      setSaveStatus("error")
      setSaveMessage(`That file is too large (max ${INGEST_MAX_MARKDOWN_CHARS.toLocaleString()} characters).`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      if (text.length > INGEST_MAX_MARKDOWN_CHARS) {
        setSaveStatus("error")
        setSaveMessage(`That file is too long (max ${INGEST_MAX_MARKDOWN_CHARS.toLocaleString()} characters).`)
        return
      }
      setMarkdown(text)
      setFileName(file.name)
      if (!title.trim()) {
        const fromName = file.name.replace(/\.(md|markdown|txt)$/i, "").replace(/[-_]+/g, " ")
        if (fromName.trim()) setTitle(fromName.trim().slice(0, 200))
      }
    }
    reader.readAsText(file)
  }, [title])

  const handleSubmit = React.useCallback(async () => {
    const body = markdown.trim()
    if (!body) {
      setSaveStatus("error")
      setSaveMessage("Paste or upload some writing first.")
      return
    }
    if (body.length > INGEST_MAX_MARKDOWN_CHARS) {
      setSaveStatus("error")
      setSaveMessage(`Writing is too long (max ${INGEST_MAX_MARKDOWN_CHARS.toLocaleString()} characters).`)
      return
    }
    setSaveStatus("saving")
    setSaveMessage(null)
    try {
      const result = await KipApi.ingestExternalWriting(domainId, {
        markdown: body,
        title: attaching ? undefined : title.trim() || undefined,
        source: "Member",
        dialogId: attaching ? dialogId : null,
      })
      invalidateDialogDocument(domainId, result.dialogId)
      boardCtx?.actions.bumpDialogNav()
      boardCtx?.actions.onDialogSelect(result.dialogId)
      if (result.sessionId) {
        boardCtx?.actions.onSessionSelect(result.sessionId)
      }
      setSaveStatus("saved")
      const sectionWord = result.appendedCount === 1 ? "section" : "sections"
      const base = result.created
        ? `Started a conversation · ${result.appendedCount} ${sectionWord}`
        : `Added ${result.appendedCount} ${sectionWord}`
      setSaveMessage(
        result.truncated
          ? `${base} (first ${INGEST_MAX_POINTS} sections — the rest was left out)`
          : base,
      )
      window.setTimeout(() => onClose(), result.truncated ? 2200 : 450)
    } catch (error) {
      setSaveStatus("error")
      setSaveMessage(error instanceof Error ? error.message : "Could not bring in writing")
    }
  }, [attaching, boardCtx, dialogId, domainId, markdown, onClose, title])

  const identityName = attaching
    ? dialogTitle?.trim() || "This conversation"
    : "New conversation"

  return (
    <ChronicleConfigShell
      identity={{
        name: identityName,
        status: attaching ? "Add writing" : "Bring in writing",
      }}
      onBack={onClose}
      saveStatus={saveStatus}
      saveMessage={saveMessage}
      isDirty={markdown.trim().length > 0}
      onSave={handleSubmit}
      onDismissError={() => {
        setSaveStatus("idle")
        setSaveMessage(null)
      }}
      saveLabel={attaching ? "Add to this conversation" : "Start conversation"}
    >
      <p
        className="text-[13px] leading-relaxed mb-4"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {attaching
          ? "Paste or upload writing from outside Keeper. It becomes part of this conversation — sections you can Gloss — not a Library upload."
          : "Paste or upload writing from outside Keeper. Keeper starts a real conversation from it, with sections you can Gloss. This is not a Library upload."}
      </p>

      {attaching ? null : (
        <div className="mb-4">
          <p
            className="keeper-presence-field-label mb-1.5"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Title
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Defaults to the first heading"
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        </div>
      )}

      <div className="mb-4">
        <p
          className="keeper-presence-field-label mb-1.5"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Writing
        </p>
        <textarea
          value={markdown}
          onChange={(e) => {
            setMarkdown(e.target.value)
            setFileName(null)
          }}
          placeholder="Paste markdown or plain text…"
          rows={12}
          className={INPUT_CLASS}
          style={{ ...INPUT_STYLE, minHeight: "14rem" }}
        />
      </div>

      <label
        className="inline-flex items-center gap-2 text-[12px] cursor-pointer"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        <input
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <span className="underline underline-offset-2">
          {fileName ? `Using ${fileName}` : "Or upload a .md file"}
        </span>
      </label>
    </ChronicleConfigShell>
  )
}
