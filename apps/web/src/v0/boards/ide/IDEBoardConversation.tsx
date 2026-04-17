"use client"

import * as React from "react"
import { KipApi } from "../../../lib/kipApi"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import type { AgentAttachment } from "../../../components/agent/AgentComposer"

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

  const threadRef = React.useRef<HTMLDivElement>(null)

  // Resolve Kip's agent ID then eagerly create a session so AgentComposer is ready immediately.
  React.useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const agent = await KipApi.getAgentBySlug("kip")
        if (cancelled) return
        setKipAgentId(agent.id)

        const session = await KipApi.createSession(agent.id, undefined, "IDE Board", {
          domainSlug,
          ...(domainId ? { domainId } : {}),
        })
        if (!cancelled) setActiveSessionId(session.id)
      } catch {
        // degrade silently — composer stays disabled
      }
    }
    void init()
    return () => { cancelled = true }
  }, [domainSlug, domainId])

  // Auto-scroll thread to bottom whenever messages change
  React.useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSubmit = async (
    _e: React.FormEvent,
    { content, attachments }: { content: string; attachments?: AgentAttachment[] },
  ) => {
    if ((!content.trim() && !attachments?.length) || isSending || !kipAgentId || !activeSessionId) return

    const ts         = Date.now()
    const thinkingId = `kip-thinking-${ts}`

    setMessages((prev) => [
      ...prev,
      { id: `user-${ts}`, role: "user", content: content || "[attachment]" },
      { id: thinkingId,   role: "kip",  content: "Kip is thinking\u2026" },
    ])
    setIsSending(true)

    try {
      const result = await KipApi.runAgent(
        kipAgentId,
        content,
        undefined,
        activeSessionId,
        {
          domainSlug,
          ...(domainId ? { domainId } : {}),
          attachments: attachments?.length ? attachments : undefined,
        },
      )

      // Lead agents return: AgentResponse.data = { action, type, data: { response, ... } }
      const outer = result.data as Record<string, unknown> | null
      const inner = (outer?.data as Record<string, unknown>) ?? null
      const reply: string =
        typeof inner?.response === "string" && inner.response ? inner.response :
        typeof outer?.response === "string" && outer.response ? outer.response :
        "I appreciate your message."

      setMessages((prev) =>
        prev.map((m) => (m.id === thinkingId ? { ...m, content: reply } : m)),
      )
    } catch (err) {
      const status  = (err as { status?: number })?.status
      const message = err instanceof Error ? err.message : ""
      const reply =
        status === 401
          ? "Please sign in to continue the conversation with Kip."
          : message && message.length > 0 && message.length < 300
            ? message
            : "Kip couldn't respond. Try again."
      setMessages((prev) =>
        prev.map((m) => (m.id === thinkingId ? { ...m, content: reply } : m)),
      )
    } finally {
      setIsSending(false)
    }
  }

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

      {/* AgentComposer — full upload + mode support */}
      <div
        className="shrink-0 border-t px-3 py-3"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <AgentComposer
          agentName="Kip"
          agentId={kipAgentId}
          domainId={domainId ?? null}
          dialogueMode="domain"
          inputValue={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onFileAttach={(text) => setInput((prev) => prev ? `${prev}\n\n${text}` : text)}
          isSending={isSending}
          activeSessionId={activeSessionId}
          disabled={!kipAgentId}
        />
      </div>
    </div>
  )
}
