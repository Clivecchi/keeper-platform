"use client"

/**
 * DesignBoardKip (was DesignerFrameKip) — Center panel of the Design Board.
 *
 * Conversation interface between the domain owner and Kip.
 *
 * Flow:
 *   1. Owner types a message about the active frame
 *   2. POST /api/domains/:domainId/kip/designer
 *   3. Kip responds; if a JSON proposal is included, a draft is auto-created
 *      and the Publish bar appears immediately — no manual "Approve" step
 *   4. Publish → call publish endpoint → live frame updates
 *
 * Conversation resets when the active frame changes.
 */

import * as React from "react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import type { DesignerMessage } from "./DesignBoardFrameList"
import { FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"

/** True when Design Board debug logging is enabled (VITE_DESIGNER_DEBUG=1 or window.__keeperDebug.designer) */
function isDesignerDebug(): boolean {
  if (typeof window === "undefined") return false
  const env = (import.meta as any)?.env?.VITE_DESIGNER_DEBUG
  if (env === "1" || env === "true") return true
  return Boolean((window as any).__keeperDebug?.designer)
}

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
  setDraftSpecJson: (spec: DomainFrameJson | null) => void
  /** True when draftSpecJson is non-null — includes direct-edit drafts with no draftId */
  hasDraftSpec: boolean
  isPublishing: boolean
  publishSuccess: boolean
  onPublish: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Build the full DomainFrameJson spec for the draft.
 *
 * The designer backend returns only the FRAME-LEVEL block (e.g. the commons
 * object, not the full domain JSON). We must merge it back into the live frame
 * at the correct key before storing as the draft spec — otherwise publish would
 * overwrite the entire Domain.frame_json with just one frame block.
 */
function buildFullSpec(
  liveDomainFrame: DomainFrameJson | null,
  frameKey: string,
  frameBlock: unknown,
): DomainFrameJson {
  const jsonKey = FRAME_TO_JSON_KEY[frameKey] ?? null
  const base = liveDomainFrame ? { ...(liveDomainFrame as Record<string, unknown>) } : {}
  if (jsonKey) {
    return { ...base, [jsonKey]: frameBlock } as DomainFrameJson
  }
  return base as DomainFrameJson
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: DesignerMessage }) {
  const isUser = msg.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
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
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest opacity-50">
            Kip
          </p>
        )}
        <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
        {/* Draft proposal indicator — shown when this message triggered an auto-draft */}
        {!!msg.draftProposal && (
          <p className="mt-1.5 text-[10px] opacity-60">
            ↑ Draft proposal generated
          </p>
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
  liveDomainFrame,
  messages,
  setMessages,
  draftId,
  setDraftId,
  setDraftSpecJson,
  hasDraftSpec,
  isPublishing,
  publishSuccess,
  onPublish,
}: DesignerFrameKipProps) {
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

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

      const frameBlock = result.draft?.spec_json ?? undefined

      // ── Add Kip's message ──
      addMessage({
        id: uid(),
        role: "kip",
        content: result.response ?? "(no response)",
        draftProposal: frameBlock,
      })

      // ── Auto-create draft when Kip returns a JSON proposal ──
      // Build the FULL DomainFrameJson spec (not just the frame block) so that
      // publish does not overwrite unrelated frame data.
      if (frameBlock !== undefined && typeof frameBlock === "object" && frameBlock !== null) {
        const fullSpec = buildFullSpec(liveDomainFrame, activeFrameKey, frameBlock)

        // Set preview immediately so Canvas updates before the API round-trip
        if (isDesignerDebug()) {
          const jsonKey = FRAME_TO_JSON_KEY[activeFrameKey] ?? null
          const block = jsonKey ? (fullSpec as Record<string, unknown>)[jsonKey] : null
          console.log("[DesignBoard:debug] setDraftSpecJson", {
            frameKey: activeFrameKey,
            fullSpecKeys: Object.keys(fullSpec as object),
            frameBlockKeys: block && typeof block === "object" ? Object.keys(block) : null,
          })
        }
        setDraftSpecJson(fullSpec)

        try {
          const frameDisplayName = FRAME_DISPLAY_NAMES[activeFrameKey] ?? activeFrameKey
          const draft = await KipApi.createDraft(domainId, {
            kind: "domain_json",
            key: `designer-${activeFrameKey}-${Date.now()}`,
            title: `${frameDisplayName} proposal`,
            spec: fullSpec,
          })
          setDraftId(draft.id)
        } catch (draftErr: any) {
          // Draft creation failed — show an error but do not lose the preview
          console.error("[DesignBoardKip] auto-create draft failed:", draftErr)
          setSendError(
            `Draft creation failed: ${draftErr?.message ?? "unknown error"}. The preview is shown but publish is unavailable.`,
          )
        }
      }
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
        style={{ borderColor: "#e5e7eb" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "#4b5563" }}
        >
          Kip · Designer
        </p>
        {frameDisplayName && (
          <p className="mt-0.5 text-[12px]" style={{ color: "#111827" }}>
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
              style={{ color: "#6b7280" }}
            >
              {activeFrameKey
                ? `Tell Kip what you want to change about the ${frameDisplayName} frame.`
                : "Select a frame from the left panel to start designing."}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
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

      {/* Draft / publish status bar — visible for Kip drafts, direct edits, and post-publish success */}
      {(hasDraftSpec || publishSuccess) && (
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
            {publishSuccess
              ? "✓ Published — live platform updated"
              : draftId
                ? "Draft ready — review preview on the right, then publish"
                : "Edit staged — review preview on the right, then publish"}
          </p>

          {hasDraftSpec && !publishSuccess && (
            <button
              type="button"
              onClick={onPublish}
              disabled={isPublishing}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity disabled:opacity-50 shrink-0"
              style={{ background: "#111827", color: "#fff" }}
            >
              {isPublishing ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      <div
        className="shrink-0 border-t px-3 py-3"
        style={{ borderColor: "#e5e7eb" }}
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
              borderColor: "#e5e7eb",
              background: "#ffffff",
              color: "#111827",
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
        <p className="mt-1.5 text-[10px]" style={{ color: "#9ca3af" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
