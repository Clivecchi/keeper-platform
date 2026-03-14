"use client"

/**
 * DesignBoardKip (was DesignerFrameKip) — Center panel of the Design Board.
 *
 * Conversation interface between the domain owner and Kip.
 *
 * Flow:
 *   1. Owner types a message about the active frame
 *   2. POST /api/domains/:domainId/kip/designer
 *   3. Kip responds conversationally (Anthropic)
 *   4. If Kip produced a JSON proposal, an Approve button appears
 *   5. Approve → create draft → preview switches to draft view
 *   6. Publish → call publish endpoint → live frame updates
 *
 * Conversation resets when the active frame changes.
 */

import * as React from "react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import type { DesignerMessage } from "./DesignBoard"
import { FRAME_DISPLAY_NAMES } from "../../shell/frameRegistryMap"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DesignerFrameKipProps {
  domainId: string | null
  domainSlug: string
  activeFrameKey: string | null
  liveDomainFrame: DomainFrameJson | null
  messages: DesignerMessage[]
  setMessages: React.Dispatch<React.SetStateAction<DesignerMessage[]>>
  draftId: string | null
  setDraftId: (id: string | null) => void
  setDraftSpecJson: (spec: unknown | null) => void
  isPublishing: boolean
  publishSuccess: boolean
  onPublish: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  domainId,
  draftId,
  setDraftId,
  setDraftSpecJson,
  addMessage,
}: {
  msg: DesignerMessage
  domainId: string | null
  draftId: string | null
  setDraftId: (id: string | null) => void
  setDraftSpecJson: (spec: unknown | null) => void
  addMessage: (m: DesignerMessage) => void
}) {
  const [isApproving, setIsApproving] = React.useState(false)
  const [approveError, setApproveError] = React.useState<string | null>(null)

  const handleApprove = async () => {
    if (!domainId || !msg.draftProposal || isApproving) return
    setIsApproving(true)
    setApproveError(null)
    try {
      const draft = await KipApi.createDraft(domainId, {
        kind: "domain_json",
        key: `designer-${Date.now()}`,
        title: `Designer proposal`,
        spec: msg.draftProposal as Record<string, unknown>,
      })
      setDraftId(draft.id)
      setDraftSpecJson(draft.spec ?? msg.draftProposal)
      addMessage({
        id: uid(),
        role: "kip",
        content: "Draft created. Review the preview on the right, then publish when ready.",
      })
    } catch (err: any) {
      setApproveError(err?.message ?? "Failed to create draft")
    } finally {
      setIsApproving(false)
    }
  }

  const isUser = msg.role === "user"

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className="max-w-[80%] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed"
        style={{
          background: isUser
            ? "hsl(var(--theme-ink-primary, 0 0% 10%))"
            : "hsl(var(--theme-surface-raised, 0 0% 94%))",
          color: isUser
            ? "hsl(var(--theme-surface-paper, 0 0% 100%))"
            : "var(--theme-ink-primary, #111)",
        }}
      >
        {!isUser && (
          <p
            className="mb-1 text-[10px] font-semibold uppercase tracking-widest opacity-50"
          >
            Kip
          </p>
        )}
        <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>

        {/* Approve button — only shown when there's a proposal and no draft yet */}
        {!!msg.draftProposal && !draftId && (
          <div className="mt-2 pt-2 border-t border-black/10">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity disabled:opacity-50"
              style={{
                background: "hsl(142 71% 45%)",
                color: "#fff",
              }}
            >
              {isApproving ? "Creating draft…" : "Approve & create draft"}
            </button>
            {approveError && (
              <p className="mt-1 text-[11px] text-red-500">{approveError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DesignerFrameKip({
  domainId,
  domainSlug: _domainSlug,
  activeFrameKey,
  liveDomainFrame: _liveDomainFrame,
  messages,
  setMessages,
  draftId,
  setDraftId,
  setDraftSpecJson,
  isPublishing,
  publishSuccess,
  onPublish,
}: DesignerFrameKipProps) {
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const addMessage = React.useCallback((m: DesignerMessage) => {
    setMessages((prev) => [...prev, m])
  }, [setMessages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !domainId || !activeFrameKey || isSending) return

    const userMsg: DesignerMessage = { id: uid(), role: "user", content: text }
    addMessage(userMsg)
    setInput("")
    setIsSending(true)
    setSendError(null)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))

      const result = await apiFetch(`/api/domains/${domainId}/kip/designer`, {
        method: "POST",
        body: JSON.stringify({
          message: text,
          frameKey: activeFrameKey,
          conversationHistory: history,
        }),
      }) as { response: string; draft?: { spec_json: unknown } }

      addMessage({
        id: uid(),
        role: "kip",
        content: result.response ?? "(no response)",
        draftProposal: result.draft?.spec_json ?? undefined,
      })
    } catch (err: any) {
      setSendError(err?.message ?? "Failed to send message")
      addMessage({
        id: uid(),
        role: "kip",
        content: "Sorry, something went wrong. Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const frameDisplayName = activeFrameKey ? (FRAME_DISPLAY_NAMES[activeFrameKey] ?? activeFrameKey) : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3 border-b"
        style={{ borderColor: "var(--theme-border-soft, #e5e7eb)" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--theme-ink-secondary, #6b7280)" }}
        >
          Kip · Designer
        </p>
        {frameDisplayName && (
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: "var(--theme-ink-primary, #111)" }}
          >
            Editing: {frameDisplayName}
          </p>
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p
              className="text-center text-[13px] max-w-xs"
              style={{ color: "var(--theme-ink-secondary, #6b7280)" }}
            >
              {activeFrameKey
                ? `Tell Kip what you want to change about the ${frameDisplayName} frame.`
                : "Select a frame from the left panel to start designing."}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            domainId={domainId}
            draftId={draftId}
            setDraftId={setDraftId}
            setDraftSpecJson={setDraftSpecJson}
            addMessage={addMessage}
          />
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-3 py-2.5 text-[13px]"
              style={{
                background: "hsl(var(--theme-surface-raised, 0 0% 94%))",
                color: "var(--theme-ink-secondary, #6b7280)",
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 opacity-50">Kip</p>
              <p>Thinking…</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Draft / publish status bar */}
      {(draftId || publishSuccess) && (
        <div
          className="shrink-0 px-4 py-3 border-t flex items-center justify-between gap-3"
          style={{
            borderColor: "var(--theme-border-soft, #e5e7eb)",
            background: publishSuccess
              ? "hsl(142 71% 96%)"
              : "hsl(43 100% 97%)",
          }}
        >
          <p
            className="text-[12px] font-medium"
            style={{ color: publishSuccess ? "hsl(142 71% 25%)" : "hsl(43 80% 30%)" }}
          >
            {publishSuccess ? "✓ Published" : "Draft ready — review preview, then publish"}
          </p>

          {draftId && !publishSuccess && (
            <button
              type="button"
              onClick={onPublish}
              disabled={isPublishing}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity disabled:opacity-50 shrink-0"
              style={{ background: "hsl(var(--theme-ink-primary, 0 0% 10%))", color: "#fff" }}
            >
              {isPublishing ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      <div
        className="shrink-0 border-t px-3 py-3"
        style={{ borderColor: "var(--theme-border-soft, #e5e7eb)" }}
      >
        {sendError && (
          <p className="mb-2 text-[11px] text-red-500">{sendError}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeFrameKey
                ? `Message Kip about the ${frameDisplayName} frame…`
                : "Select a frame to start"
            }
            disabled={!activeFrameKey || isSending}
            rows={2}
            className="flex-1 resize-none rounded-lg border px-3 py-2 text-[13px] outline-none transition-colors disabled:opacity-40"
            style={{
              borderColor: "var(--theme-border-soft, #e5e7eb)",
              background: "hsl(var(--theme-surface-paper, 0 0% 100%))",
              color: "var(--theme-ink-primary, #111)",
              maxHeight: 120,
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || !activeFrameKey || isSending}
            className="rounded-lg px-3 py-2 text-[13px] font-medium transition-opacity disabled:opacity-30 shrink-0"
            style={{
              background: "hsl(var(--theme-ink-primary, 0 0% 10%))",
              color: "#fff",
            }}
          >
            Send
          </button>
        </div>
        <p
          className="mt-1.5 text-[10px]"
          style={{ color: "var(--theme-ink-secondary, #9ca3af)" }}
        >
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
