"use client"

import * as React from "react"
import { KipApi } from "../../../lib/kipApi"
import { useAgentSessions } from "../../../hooks/useAgentSessions"

// ─── Props ────────────────────────────────────────────────────────────────────

interface IDEBoardConversationProps {
  domainSlug: string
  /** Optional — improves context precision. Falls back to domainSlug lookup server-side. */
  domainId?: string | null
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "kip"

interface Message {
  id: string
  role: MessageRole
  content: string
}

const GREETING: Message = {
  id: "kip-greeting",
  role: "kip",
  content: "I'm here. What are we building?",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IDEBoardConversation({ domainSlug, domainId }: IDEBoardConversationProps) {
  const [messages, setMessages]               = React.useState<Message[]>([GREETING])
  const [input, setInput]                     = React.useState("")
  const [isSending, setIsSending]             = React.useState(false)
  const [kipAgentId, setKipAgentId]           = React.useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)

  const { createSession } = useAgentSessions(kipAgentId ?? undefined)

  const threadRef   = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Resolve Kip's agent ID once on mount. Uses the authenticated /api/kip/agents endpoint.
  React.useEffect(() => {
    let cancelled = false
    KipApi.getAgentBySlug("kip")
      .then((agent) => { if (!cancelled) setKipAgentId(agent.id) })
      .catch(() => { /* degrade silently — send will remain disabled */ })
    return () => { cancelled = true }
  }, [])

  // Auto-scroll thread to bottom whenever messages change
  React.useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Auto-resize textarea
  React.useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [input])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isSending || !kipAgentId) return

    const ts         = Date.now()
    const thinkingId = `kip-thinking-${ts}`

    setMessages((prev) => [
      ...prev,
      { id: `user-${ts}`, role: "user", content: text },
      { id: thinkingId,   role: "kip",  content: "Kip is thinking\u2026" },
    ])
    setInput("")
    setIsSending(true)

    try {
      // Create a DB-backed session on the first turn; resume on all subsequent turns.
      let sessionId = activeSessionId
      if (!sessionId) {
        const session = await createSession("IDE Board", { domainSlug })
        sessionId = session.id
        setActiveSessionId(sessionId)
      }

      const result = await KipApi.runAgent(
        kipAgentId,
        text,
        undefined,
        sessionId,
        {
          domainSlug,
          ...(domainId ? { domainId } : {}),
        },
      )

      const data = result.data as Record<string, unknown> | null
      const reply: string =
        typeof data?.response === "string" && data.response
          ? data.response
          : "I appreciate your message."

      setMessages((prev) =>
        prev.map((m) => (m.id === thinkingId ? { ...m, content: reply } : m)),
      )
    } catch (err) {
      const status = (err as { status?: number })?.status
      const reply =
        status === 401
          ? "Please sign in to continue the conversation with Kip."
          : "Kip couldn't respond. Try again."
      setMessages((prev) =>
        prev.map((m) => (m.id === thinkingId ? { ...m, content: reply } : m)),
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const canSend = Boolean(input.trim()) && !isSending && Boolean(kipAgentId)

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* Banner */}
      <div
        className="shrink-0 px-4 py-3 border-b"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Conversation
        </p>
        <p
          className="text-[13px] font-medium mt-0.5"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          Development Journey
        </p>
      </div>

      {/* Message thread */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {m.role === "kip" ? "Kip" : "You"}
            </span>
            <div
              className="max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed"
              style={
                m.role === "kip"
                  ? {
                      background: "hsl(var(--theme-surface-elevated))",
                      border: "1px solid hsl(var(--theme-line-hairline))",
                      color: "hsl(var(--theme-ink-primary))",
                    }
                  : {
                      background: "hsl(var(--theme-surface-panel))",
                      border: "1px solid hsl(var(--theme-line-hairline))",
                      color: "hsl(var(--theme-ink-primary))",
                    }
              }
            >
              <span
                style={
                  m.content === "Kip is thinking\u2026"
                    ? { color: "hsl(var(--theme-ink-tertiary))", fontStyle: "italic" }
                    : undefined
                }
              >
                {m.content}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Ambient input */}
      <div
        className="shrink-0 border-t px-3 py-3"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={kipAgentId ? "Direct Kip..." : "Connecting to Kip…"}
            rows={1}
            disabled={isSending || !kipAgentId}
            className="flex-1 resize-none rounded-lg border px-3 py-2.5 text-[13px] outline-none transition-colors focus-visible:ring-1 min-h-[40px] max-h-[120px]"
            style={{
              borderColor: "hsl(var(--theme-line-hairline))",
              background: "hsl(var(--theme-surface-elevated))",
              color: "hsl(var(--theme-ink-primary))",
            }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="shrink-0 rounded-lg p-2.5 transition-opacity disabled:opacity-40 self-end"
            style={{
              background: "hsl(var(--theme-ink-primary))",
              color: "hsl(var(--theme-surface-page))",
            }}
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M2 7h9M8 4l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
