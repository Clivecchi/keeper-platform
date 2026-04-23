"use client"

import * as React from "react"
import type { KipMessage } from "../../../lib/kipApi"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import { DialogueMessageList } from "../../../components/agent/DialogueMessageList"
import { extractLinkedCard } from "../../../components/agent/helpers"
import { useAuth } from "../../../context/AuthContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { useV0Shell } from "../../shell/V0ShellContext"
import type { IDEBoardKipContext } from "./ideBoardTypes"
import { useKipSession } from "../../../hooks/useKipSession"
import { useDraftContext } from "../../../hooks/useDraftContext"

// ─── Props ────────────────────────────────────────────────────────────────────

interface IDEBoardConversationProps {
  domainSlug: string
  /** Optional — improves context precision. Falls back to domainSlug lookup server-side. */
  domainId?: string | null
  activeSessionId: string | null
  onActiveSessionIdChange: (id: string | null) => void
  activeJourneyId: string | null
  /** When set, resolves the linked session and loads messages for that draft. */
  selectedDraftId: string | null
  onKipContextSync: (ctx: IDEBoardKipContext) => void
  /** Open a draft in the IDE Board without leaving the page */
  onSelectDraftInPlace: (id: string) => void
  /** Open a moment in the context panel without leaving the board */
  onMomentSelect: (momentId: string) => void
  /** Dialog banner eyebrow (e.g. Conversation, Draft, Journey) */
  bannerEyebrow?: string
  /** Dialog banner title line */
  bannerTitle?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function syncKipContextFromKipResponse(
  onKipContextSync: (ctx: IDEBoardKipContext) => void,
  rawMessages: KipMessage[] | undefined,
  actions: unknown[] | undefined,
) {
  if (Array.isArray(actions)) {
    for (const ar of actions) {
      const a = ar as { type?: string; result?: { draft?: { id: string } } }
      if (a.type === "draft.create" && a.result?.draft?.id) {
        onKipContextSync({ type: "draft", id: a.result.draft.id })
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
        onKipContextSync({ type: linked.entityType, id: linked.entityId })
      }
    }
    return
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IDEBoardConversation({
  domainSlug,
  domainId,
  activeSessionId,
  onActiveSessionIdChange,
  activeJourneyId,
  selectedDraftId,
  onKipContextSync,
  onSelectDraftInPlace,
  onMomentSelect,
  bannerEyebrow = "Conversation",
  bannerTitle = "Development Journey",
}: IDEBoardConversationProps) {
  const { domainFrame, resolvedAudience } = useV0Shell()
  const frameCtx = useFrameContextOptional()
  const { refreshSession } = useAuth()

  const onAfterAgentRun = React.useCallback(
    (latestRaw: KipMessage[] | undefined, actionResults: unknown[] | undefined) => {
      syncKipContextFromKipResponse(onKipContextSync, latestRaw, actionResults)
    },
    [onKipContextSync],
  )

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
    error,
    kipAgentId,
    sendMessage,
  } = useKipSession({
    mode: "ide",
    domainSlug,
    domainId,
    activeJourneyId,
    experienceContext,
    resolvedAudience: resolvedAudience ?? "keeper",
    refreshSession,
    frameCtx,
    controlledSessionId: activeSessionId,
    onControlledSessionIdChange: onActiveSessionIdChange,
    onAfterAgentRun,
  })

  useDraftContext({
    selectedDraftId,
    domainId,
    kipAgentId,
    activeSessionId,
    onActiveSessionIdChange,
  })

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      <div
        className="shrink-0 border-b"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--theme-ink-tertiary-color)" }}
          >
            {bannerEyebrow}
          </p>
          <p
            className="mt-1 text-[14px] font-semibold leading-snug"
            style={{ color: "var(--theme-ink-primary-color)" }}
          >
            {bannerTitle}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
          <DialogueMessageList
            isLoading={false}
            messages={messages}
            isSending={isSending}
            error={error}
            agentName="Kip"
            onOpenDraft={onSelectDraftInPlace}
            onOpenMoment={onMomentSelect}
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
