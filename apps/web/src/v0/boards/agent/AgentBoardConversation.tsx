"use client"

import * as React from "react"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import { DialogueMessageList } from "../../../components/agent/DialogueMessageList"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useKipSession } from "../../../hooks/useKipSession"
import { useDraftContext } from "../../../hooks/useDraftContext"

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

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoardConversation({
  domainSlug,
  domainId,
  agents: _agents,
  refreshDrafts,
  onDraftSelect,
}: AgentBoardConversationProps) {
  const { domainFrame, resolvedAudience } = useV0Shell()

  const draftCtx = useDraftContext({
    selectedDraftId: null,
    domainId,
    kipAgentId: null,
    activeSessionId: null,
    onRefreshDraftList: refreshDrafts,
  })

  const experienceContext = React.useMemo(() => {
    if (!domainFrame) return undefined
    const audience = resolvedAudience ?? "keeper"
    return {
      audience,
      model: domainFrame.kip.model,
      forward: domainFrame.forward,
      directions: domainFrame.directions.filter((d) => d.available_to.includes(audience)),
      kip_context: domainFrame.kip_context[audience] ?? "",
    }
  }, [domainFrame, resolvedAudience])

  const {
    messages,
    input,
    setInput,
    isSending,
    kipAgentId,
    activeSessionId,
    sendMessage,
  } = useKipSession({
    mode: "agent",
    domainSlug,
    domainId,
    experienceContext,
    resolvedAudience: resolvedAudience ?? "keeper",
    onRefreshDraftsAfterRun: draftCtx.refreshDraftsAfterRun,
  })

  const threadRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
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
          onSubmit={sendMessage}
          onFileAttach={(text) => setInput((prev) => (prev ? `${prev}\n\n${text}` : text))}
          isSending={isSending}
          activeSessionId={activeSessionId}
          disabled={!kipAgentId}
        />
      </div>
    </div>
  )
}
