"use client"

import * as React from "react"
import type { KipMessage } from "../../../lib/kipApi"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import { DialogueMessageList } from "../../../components/agent/DialogueMessageList"
import { SessionBannerCard } from "../../../components/agent/SessionBannerCard"
import { extractLinkedCard } from "../../../components/agent/helpers"
import { useAuth } from "../../../context/AuthContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { useV0Shell } from "../../shell/V0ShellContext"
import type { IDEBoardKipContext } from "./ideBoardTypes"
import { useKipSession } from "../../../hooks/useKipSession"
import { useDraftContext } from "../../../hooks/useDraftContext"
import { IntegratedServicesBar } from "./components/IntegratedServicesBar"
import type { IntegratedServicesBarProps } from "./components/IntegratedServicesBar"

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceSlug = Parameters<IntegratedServicesBarProps["onOpen"]>[0]

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
  /** Active keeper name for the banner */
  keeperName?: string | null
  /** Active journey name for the banner */
  journeyName?: string | null
  /** Opens the Services panel in the right panel, optionally jumping to a specific service */
  onServiceOpen?: (service?: ServiceSlug) => void
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
  keeperName,
  journeyName,
  onServiceOpen,
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

  const modelProvider = (domainFrame?.kip as any)?.model ?? null

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* ── Banner header ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-b"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        {/* Row 1: SessionBannerCard */}
        <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-2">
          <SessionBannerCard
            sessionTitle={journeyName || "Development Journey"}
            sessionId={activeSessionId}
            journeyName={journeyName}
            keeperName={keeperName}
            modelProvider={modelProvider}
            // TODO: wire soleActive from session — useKipSession does not yet expose soleStatus
            soleActive={false}
            onOpenCockpit={() => {
              // TODO: open IDE CockpitPanel — wired, not yet built
            }}
          />
        </div>

        {/* Row 2: Integrated Services bar */}
        <IntegratedServicesBar
          onOpen={onServiceOpen ?? (() => {})}
          cloudStatus="connected"
          railwayStatus="disconnected"
          vercelStatus="disconnected"
          githubStatus="disconnected"
        />
      </div>

      {/* ── Conversation thread ───────────────────────────────────────────── */}
      <div className="keeper-panel-scroll min-h-0 flex-1 overflow-y-auto">
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

      {/* ── Composer ──────────────────────────────────────────────────────── */}
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
