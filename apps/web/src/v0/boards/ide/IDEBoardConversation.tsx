"use client"

import * as React from "react"
import { KipApi } from "../../../lib/kipApi"
import type { KipMessage } from "../../../lib/kipApi"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import type { AgentAttachment } from "../../../components/agent/AgentComposer"
import { DialogueMessageList } from "../../../components/agent/DialogueMessageList"
import type { AgentDialogueMessage } from "../../../components/agent/types"
import { extractLinkedCard } from "../../../components/agent/helpers"
import { useV0Shell } from "../../shell/V0ShellContext"
import type { IDEBoardActiveContext } from "./IDEBoard"

// ─── Props ────────────────────────────────────────────────────────────────────

interface IDEBoardConversationProps {
  domainSlug: string
  /** Optional — improves context precision. Falls back to domainSlug lookup server-side. */
  domainId?: string | null
  /** When set, loads this session's messages instead of creating a new one. */
  selectedSessionId?: string | null
  setActiveContext: React.Dispatch<React.SetStateAction<IDEBoardActiveContext>>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    ...(linkedCard ? { linkedCard } : {}),
    ...(actionResults?.length ? { actionResults } : {}),
  }
}

const GREETING: AgentDialogueMessage = {
  id: "kip-greeting",
  role: "agent",
  content: "I'm here. What are we building?",
  createdAt: new Date().toISOString(),
}

/** After a successful run, align view context with linked cards or draft.create in the response. */
function syncActiveContextFromKipResponse(
  setActiveContext: React.Dispatch<React.SetStateAction<IDEBoardActiveContext>>,
  rawMessages: KipMessage[] | undefined,
  actions: unknown[] | undefined,
) {
  if (Array.isArray(actions)) {
    for (const ar of actions) {
      const a = ar as { type?: string; result?: { draft?: { id: string } } }
      if (a.type === "draft.create" && a.result?.draft?.id) {
        setActiveContext({ type: "draft", id: a.result.draft.id })
        return
      }
    }
  }
  if (!rawMessages?.length) return
  for (let i = rawMessages.length - 1; i >= 0; i--) {
    const m = rawMessages[i]
    if ((m.sender || m.role) === "user") continue
    const linked = extractLinkedCard(m.metadata)
    if (linked) {
      if (linked.entityType === "journey" || linked.entityType === "moment" || linked.entityType === "keeper") {
        setActiveContext({ type: linked.entityType, id: linked.entityId })
      }
    }
    return
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IDEBoardConversation({ domainSlug, domainId, selectedSessionId, setActiveContext }: IDEBoardConversationProps) {
  const { domainFrame, resolvedAudience, navigateToFrame } = useV0Shell()
  const [messages, setMessages]               = React.useState<AgentDialogueMessage[]>([GREETING])
  const [input, setInput]                     = React.useState("")
  const [isSending, setIsSending]             = React.useState(false)
  const [error, setError]                     = React.useState<string | null>(null)
  const [kipAgentId, setKipAgentId]           = React.useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)

  // Re-fetch persisted messages from session — same pattern as AgentBoardFrame
  const fetchMessages = React.useCallback(async (sessionId: string) => {
    try {
      const msgs: KipMessage[] = await KipApi.getSessionMessages(sessionId)
      setMessages(msgs.map(normalizeMessage))
      return msgs
    } catch {
      // keep existing messages if fetch fails
      return undefined
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

  // When a session is selected from the nav, switch to it and load its messages.
  React.useEffect(() => {
    if (!selectedSessionId) return
    setActiveSessionId(selectedSessionId)
    fetchMessages(selectedSessionId)
  }, [selectedSessionId, fetchMessages])

  const handleSubmit = async (
    _e: React.FormEvent,
    { content, attachments }: { content: string; attachments?: AgentAttachment[] },
  ) => {
    if ((!content.trim() && !attachments?.length) || isSending || !kipAgentId || !activeSessionId) return

    const ts = Date.now()
    const optimistic: AgentDialogueMessage = {
      id: `user-${ts}`,
      role: "user",
      content: content || "[attachment]",
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimistic])
    setInput("")
    setIsSending(true)
    setError(null)

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

      const latestRaw = await fetchMessages(activeSessionId)
      const respData = (result as any)?.data
      const actionResults = respData?.actions || (result as any)?.actionResults || undefined
      syncActiveContextFromKipResponse(
        setActiveContext,
        latestRaw,
        Array.isArray(actionResults) ? actionResults : undefined,
      )

      // Attach actionResults from response to last agent message
      if (actionResults && Array.isArray(actionResults) && actionResults.length > 0) {
        setMessages((prev) => {
          const updated = [...prev]
          const lastAgentIdx = updated.findLastIndex((m) => m.role === "agent")
          if (lastAgentIdx >= 0) {
            updated[lastAgentIdx] = { ...updated[lastAgentIdx], actionResults }
          }
          return updated
        })
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      const status  = (err as { status?: number })?.status
      const message = err instanceof Error ? err.message : ""
      setError(
        status === 401
          ? "Please sign in to continue the conversation with Kip."
          : message && message.length > 0 && message.length < 300
            ? message
            : "Kip couldn't respond. Try again."
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
      <div className="flex-1 overflow-y-auto min-h-0">
        <DialogueMessageList
          isLoading={false}
          messages={messages}
          isSending={isSending}
          error={error}
          agentName="Kip"
          onOpenDraft={(draftId) => navigateToFrame("moment" as any, { draftId })}
          onOpenMoment={(momentId) => navigateToFrame("moment" as any, { draftId: momentId })}
        />
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
