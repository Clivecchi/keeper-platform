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
  bannerEyebrow?: string
  bannerTitle?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoardConversation({
  domainSlug,
  domainId,
  agents: _agents,
  refreshDrafts,
  onDraftSelect,
  bannerEyebrow = "Conversation",
  bannerTitle = "Agent Studio",
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
        className="shrink-0 border-b"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--theme-ink-tertiary-color)" }}
          >
            {bannerEyebrow}
          </p>
          <p
            className="mt-0.5 text-[13px] font-medium leading-snug"
            style={{ color: "var(--theme-ink-primary-color)" }}
          >
            {bannerTitle}
          </p>
        </div>
      </div>

      <div ref={threadRef} className="keeper-panel-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
          <DialogueMessageList
            isLoading={false}
            messages={messages}
            isSending={isSending}
            error={null}
            agentName="Kip"
            onOpenDraft={onDraftSelect}
            agentBubbleFullWidth
          />
        </div>
      </div>

      <div
        className="shrink-0 border-t"
        style={{
          borderColor: "hsl(var(--theme-line-hairline))",
          background: "hsl(var(--theme-surface-elevated))",
        }}
      >
        <div className="mx-auto w-full max-w-3xl px-3 py-3">
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
    </div>
  )
}
