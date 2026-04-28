"use client"

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useKipSession } from "../../../hooks/useKipSession"
import { useDraftContext } from "../../../hooks/useDraftContext"
import { KeeperDialogFrame } from "../../components/dialog/KeeperDialogFrame"

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

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      <KeeperDialogFrame
        keeperName={bannerEyebrow || undefined}
        journeyName={bannerTitle || undefined}
        showServiceBar={false}
        messages={messages}
        isSending={isSending}
        error={null}
        agentName="Kip"
        onOpenDraft={onDraftSelect}
        agentBubbleFullWidth
        agentId={kipAgentId}
        domainId={domainId ?? null}
        dialogueMode="domain"
        inputValue={input}
        onInputChange={setInput}
        onSubmit={sendMessage}
        onFileAttach={(text) => setInput((prev) => (prev ? `${prev}\n\n${text}` : text))}
        activeSessionId={activeSessionId}
        disabled={!kipAgentId}
      />
    </div>
  )
}
