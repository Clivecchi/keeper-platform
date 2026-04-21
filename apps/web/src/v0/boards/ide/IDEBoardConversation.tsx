"use client"

import * as React from "react"
import { KipApi } from "../../../lib/kipApi"
import type { KipMessage } from "../../../lib/kipApi"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import type { AgentAttachment } from "../../../components/agent/AgentComposer"
import { useV0Shell } from "../../shell/V0ShellContext"

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
  const { domainFrame, resolvedAudience } = useV0Shell()
  const [messages, setMessages]               = React.useState<Message[]>([GREETING])
  const [input, setInput]                     = React.useState("")
  const [isSending, setIsSending]             = React.useState(false)
  const [kipAgentId, setKipAgentId]           = React.useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)

  const threadRef = React.useRef<HTMLDivElement>(null)

  // Re-fetch persisted messages from session — same pattern as AgentBoardFrame
  const fetchMessages = React.useCallback(async (sessionId: string) => {
    try {
      const msgs: KipMessage[] = await KipApi.getSessionMessages(sessionId)
      setMessages(msgs.map((m) => ({
        id: m.id,
        role: ((m.sender || m.role) === "user" ? "user" : "kip") as MessageRole,
        content: m.content,
      })))
    } catch {
      // keep existing messages if fetch fails
    }
  }, [])

  // Resolve Kip's agent ID then eagerly create a session so AgentComposer is ready immediately.
  React.useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const agent = await KipApi.getLeadAgent("kip")
        if (cancelled) return
        setKipAgentId(agent.id)

        const session = await KipApi.createSession(agent.id, undefined, "IDE Board", {
          domainSlug,
          ...(domainId ? { domainId } : {}),
          dialogBoard: "ide",
          dialogFrame: "conversation",
          dialogSubject: "domain",
          dialogScope: resolvedAudience === "admin" ? "admin" : "keeper",
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
    setInput("")
    setIsSending(true)

    const audience = resolvedAudience ?? "keeper"
    const experienceContext: Record<string, unknown> | undefined = domainFrame
      ? {
          audience,
          model: domainFrame.kip.model,
          forward: domainFrame.forward,
          directions: domainFrame.directions.filter((d) => d.available_to.includes(audience)),
          kip_context: domainFrame.kip_context[audience] ?? "",
        }
      : undefined

    try {
      await KipApi.runAgent(
        kipAgentId,
        content,
        undefined,
        activeSessionId,
        {
          domainSlug,
          domainId: domainId || undefined,
          mode: "domain",
          experienceContext,
          attachments: attachments?.length ? attachments : undefined,
        },
      )

      await fetchMessages(activeSessionId)
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
        className="shrink-0 px-4 py-4 border-b"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Conversation
        </p>
        <p
          className="text-[14px] font-semibold mt-1"
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
              className="text-[11px] font-semibold uppercase tracking-widest mb-1"
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
                      borderLeft: "2px solid hsl(var(--theme-accent-subtle, var(--theme-line-hairline)))",
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
        style={{
          borderColor: "hsl(var(--theme-line-hairline))",
          background: "hsl(var(--theme-surface-elevated))",
        }}
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
