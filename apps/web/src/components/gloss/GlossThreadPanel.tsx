"use client"

import * as React from "react"
import type { GlossAnchor, GlossContentSnapshot, GlossThread } from "@keeper/shared"

export interface GlossThreadPanelProps {
  anchor: GlossAnchor
  messageId: string
  snapshot?: GlossContentSnapshot
  thread?: GlossThread
  isSending: boolean
  onClose: () => void
  onSend: (text: string) => void
}

export function GlossThreadPanel({
  anchor,
  snapshot,
  thread,
  isSending,
  onClose,
  onSend,
}: GlossThreadPanelProps) {
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [thread?.messages.length, isSending])

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

  return (
    <div
      className="gloss-thread mt-2 overflow-hidden rounded-lg border text-xs"
      style={{
        borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        background: "hsl(var(--theme-surface-elevated) / 0.92)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-2.5 py-1.5"
        style={{ borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))" }}
      >
        <span
          className="font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))", fontSize: "9px" }}
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

      {snapshot?.text || snapshot?.imageUrl ? (
        <div
          className="border-b px-2.5 py-2"
          style={{ borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))" }}
        >
          {snapshot.imageUrl ? (
            <img
              src={snapshot.imageUrl}
              alt=""
              className="mb-1.5 max-h-24 w-full rounded object-cover"
            />
          ) : null}
          {snapshot.text ? (
            <p
              className="line-clamp-3 leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {snapshot.text}
            </p>
          ) : null}
        </div>
      ) : null}

      <div ref={scrollRef} className="max-h-48 space-y-2 overflow-y-auto px-2.5 py-2">
        {!thread?.messages.length ? (
          <p style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Ask about this — your exchange stays here, in context.
          </p>
        ) : (
          thread.messages.map((m) => (
            <div
              key={m.id}
              className={[
                "rounded-lg px-2.5 py-1.5 leading-relaxed",
                m.role === "user" ? "ml-4" : "mr-4",
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
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-1.5 border-t px-2 py-2"
        style={{ borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))" }}
      >
        <input
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
      </form>
    </div>
  )
}
