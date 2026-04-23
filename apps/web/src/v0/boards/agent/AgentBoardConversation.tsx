"use client"

import * as React from "react"
import { KipApi } from "../../../lib/kipApi"
import type { KipMessage } from "../../../lib/kipApi"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import type { AgentAttachment } from "../../../components/agent/AgentComposer"
import { DialogueMessageList } from "../../../components/agent/DialogueMessageList"
import type { AgentDialogueMessage } from "../../../components/agent/types"
import { normalizeActionReceipt } from "../../../components/agent/types"
import { extractLinkedCard } from "../../../components/agent/helpers"
import { useV0Shell } from "../../shell/V0ShellContext"

// ─── Props ────────────────────────────────────────────────────────────────────

export type AgentItem = {
  name: string
  model: string
  scope: string
}

interface AgentBoardConversationProps {
  domainSlug: string
  /** Optional — improves context precision. Falls back to domainSlug lookup server-side. */
  domainId?: string | null
  /** Agent list passed from board level for reference (retained for API compat). */
  agents?: AgentItem[]
  refreshDrafts?: () => void
  onDraftSelect?: (draftId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeMessage(message: KipMessage): AgentDialogueMessage {
  const role = (message.sender || message.role) === "user" ? "user" : "agent"
  const meta = message.metadata as Record<string, unknown> | null | undefined
  const actionResults = Array.isArray(meta?.actionResults) ? meta.actionResults : undefined
  const linkedCard = extractLinkedCard(meta)
  return {
    id: message.id,
    role,
    content: message.content,
    createdAt: new Date(message.created_at || Date.now()).toISOString(),
    linkedCard,
    actionResults,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoardConversation({ domainSlug, domainId, agents: _agents, refreshDrafts, onDraftSelect }: AgentBoardConversationProps) {
  const { domainFrame, resolvedAudience } = useV0Shell()
  const [messages, setMessages]               = React.useState<AgentDialogueMessage[]>([])
  const [input, setInput]                     = React.useState("")
  const [isSending, setIsSending]             = React.useState(false)
  const [kipAgentId, setKipAgentId]           = React.useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)

  const threadRef = React.useRef<HTMLDivElement>(null)  // kept for scroll-to-bottom

  // Re-fetch persisted messages from session — same pattern as AgentBoardFrame
  const fetchMessages = React.useCallback(async (sessionId: string) => {
    try {
      const msgs: KipMessage[] = await KipApi.getSessionMessages(sessionId)
      setMessages(msgs.map(normalizeMessage))
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

        const session = await KipApi.createSession(agent.id, undefined, "Agent Board", {
          domainSlug,
          ...(domainId ? { domainId } : {}),
          dialogBoard: "agent",
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
      { id: `user-${ts}`, role: "user", content: content || "[attachment]", createdAt: new Date(ts).toISOString() },
      { id: thinkingId,   role: "agent", content: "Kip is thinking\u2026",  createdAt: new Date(ts).toISOString() },
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
      const result = await KipApi.runAgent(
        kipAgentId,
        content,
        undefined,
        activeSessionId,
        {
          domainSlug: domainSlug || undefined,
          domainId: domainId || undefined,
          mode: "domain",
          activeJourneyId: undefined,
          activeKeeperId: undefined,
          experienceContext,
          attachments: attachments?.length ? attachments : undefined,
        },
      )

      await fetchMessages(activeSessionId)

      const actionResults = (result as any)?.data?.actions
      if (Array.isArray(actionResults) && actionResults.length > 0) {
        const hasDraftMutation = actionResults.some((ar: any) => {
          const n = normalizeActionReceipt(ar)
          return n.status === "success" && ["draft.create", "draft.update", "draft.delete", "draft.setActive"].includes(n.type)
        })
        if (hasDraftMutation) await refreshDrafts?.()
      }
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
          Agent Studio
        </p>
      </div>

      {/* Message thread */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        <DialogueMessageList
          isLoading={false}
          messages={messages}
          isSending={isSending}
          error={null}
          agentName="Kip"
          onOpenDraft={onDraftSelect}
        />
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
