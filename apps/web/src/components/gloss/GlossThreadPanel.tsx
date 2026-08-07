"use client"

import * as React from "react"
import type { GlossAnchor, GlossContentSnapshot, GlossThread } from "@keeper/shared"

export type GlossThreadSurface = "dialog" | "chronicle"

export interface GlossThreadPanelProps {
  anchor: GlossAnchor
  messageId: string
  snapshot?: GlossContentSnapshot
  thread?: GlossThread
  isSending: boolean
  onClose: () => void
  onSend: (text: string) => void
  /**
   * `dialog` — compact inline under a chat node (default).
   * `chronicle` — Document Point polish: no body replay, roomy thread + composer.
   */
  surface?: GlossThreadSurface
  /** Honest outcome after a turn (e.g. Point updated / rewrite did not run). */
  statusNote?: string | null
}

export function GlossThreadPanel({
  anchor,
  snapshot,
  thread,
  isSending,
  onClose,
  onSend,
  surface = "dialog",
  statusNote = null,
}: GlossThreadPanelProps) {
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement | HTMLInputElement>(null)
  const isChronicle = surface === "chronicle"

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [thread?.messages.length, isSending])

  React.useEffect(() => {
    if (!isChronicle) return
    inputRef.current?.focus()
  }, [isChronicle])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return
    onSend(trimmed)
    setInput("")
  }

  const label =
    snapshot?.label
    ?? (anchor.nodeId ? String(anchor.nodeId) : "this")

  // Dialog gloss may preview a receipt/image; Chronicle already shows the Point above — never re-print body text.
  const showSnapshotPreview =
    !isChronicle && Boolean(snapshot?.imageUrl || snapshot?.text)

  return (
    <div
      className={[
        "gloss-thread overflow-hidden rounded-lg border",
        isChronicle ? "mt-3 flex min-h-[min(52vh,420px)] flex-col text-[15px]" : "mt-2 text-xs",
      ].join(" ")}
      style={{
        borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        background: isChronicle
          ? "hsl(var(--theme-surface-elevated) / 0.96)"
          : "hsl(var(--theme-surface-elevated) / 0.92)",
      }}
      onClick={(e) => e.stopPropagation()}
      data-gloss-surface={surface}
    >
      <div
        className={[
          "flex shrink-0 items-center justify-between gap-2 border-b",
          isChronicle ? "px-3.5 py-2.5" : "px-2.5 py-1.5",
        ].join(" ")}
        style={{ borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))" }}
      >
        <span
          className="font-semibold uppercase tracking-widest"
          style={{
            color: "hsl(var(--theme-ink-tertiary))",
            fontSize: isChronicle ? "11px" : "9px",
          }}
        >
          Gloss · {label}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1.5 py-0.5 opacity-70 hover:opacity-100"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
          aria-label="Close gloss"
        >
          ✕
        </button>
      </div>

      {showSnapshotPreview ? (
        <div
          className="shrink-0 border-b px-2.5 py-2"
          style={{ borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))" }}
        >
          {snapshot?.imageUrl ? (
            <img
              src={snapshot.imageUrl}
              alt=""
              className="mb-1.5 max-h-24 w-full rounded object-cover"
            />
          ) : null}
          {snapshot?.text ? (
            <p
              className="line-clamp-3 leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {snapshot.text}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className={[
          "min-h-0 flex-1 space-y-2.5 overflow-y-auto",
          isChronicle ? "px-3.5 py-3" : "max-h-48 space-y-2 px-2.5 py-2",
        ].join(" ")}
      >
        {!thread?.messages.length ? (
          <p
            className={isChronicle ? "text-[14px] leading-relaxed" : undefined}
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {isChronicle
              ? "Polish this Point here — Kip already has the text above."
              : "Ask about this — your exchange stays here, in context."}
          </p>
        ) : (
          thread.messages.map((m) => (
            <div
              key={m.id}
              className={[
                "rounded-lg leading-relaxed whitespace-pre-wrap",
                isChronicle ? "px-3 py-2.5 text-[15px]" : "px-2.5 py-1.5",
                m.role === "user" ? "ml-6" : "mr-6",
              ].join(" ")}
              style={
                m.role === "user"
                  ? {
                      background: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%) / 0.18)",
                      color: "hsl(var(--theme-ink-primary))",
                    }
                  : {
                      background: "hsl(var(--theme-surface-paper))",
                      color: "hsl(var(--theme-ink-primary))",
                      border: "1px solid hsl(var(--theme-border-soft) / 0.6)",
                    }
              }
            >
              {m.content}
            </div>
          ))
        )}
        {isSending ? (
          <p className="italic" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Thinking…
          </p>
        ) : null}
        {statusNote ? (
          <p
            className={isChronicle ? "text-[13px] font-medium leading-snug" : "text-[11px]"}
            style={{
              color: /unchanged|did not|no point rewrite/i.test(statusNote)
                ? "hsl(var(--theme-status-error))"
                : "hsl(var(--theme-status-success))",
            }}
            role="status"
          >
            {statusNote}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className={[
          "shrink-0 border-t",
          isChronicle ? "flex flex-col gap-2 px-3.5 py-3" : "flex gap-1.5 px-2 py-2",
        ].join(" ")}
        style={{ borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))" }}
      >
        {isChronicle ? (
          <>
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or rewrite from this Point…"
              disabled={isSending}
              rows={3}
              className="min-h-[88px] w-full resize-y rounded-md border px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:ring-1"
              style={{
                borderColor: "hsl(var(--theme-border-soft))",
                background: "hsl(var(--theme-surface-paper))",
                color: "hsl(var(--theme-ink-primary))",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                ⌘/Ctrl + Enter to send
              </p>
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="rounded-md px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
                style={{ background: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Discuss this…"
              disabled={isSending}
              className="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs outline-none focus:ring-1"
              style={{
                borderColor: "hsl(var(--theme-border-soft))",
                background: "hsl(var(--theme-surface-paper))",
                color: "hsl(var(--theme-ink-primary))",
              }}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
            >
              Send
            </button>
          </>
        )}
      </form>
    </div>
  )
}
