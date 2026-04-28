"use client"

import * as React from "react"
import { KipApi } from "../../../lib/kipApi"
import type { KipMessage } from "../../../lib/kipApi"
import { SessionBannerCard } from "../../../components/agent/SessionBannerCard"
import { extractLinkedCard } from "../../../components/agent/helpers"
import { useAuth } from "../../../context/AuthContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { useV0Shell } from "../../shell/V0ShellContext"
import type { IDEBoardKipContext } from "./ideBoardTypes"
import { useKipSession } from "../../../hooks/useKipSession"
import { useDraftContext } from "../../../hooks/useDraftContext"
import type { IntegratedServicesBarProps } from "./components/IntegratedServicesBar"
import { KeeperDialogFrame } from "../../components/dialog/KeeperDialogFrame"

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
  /** Actual session title — shown in banner header (not the journey name) */
  sessionTitle?: string | null
  /** Called after a successful session rename so the parent can update its sessions list */
  onSaveSessionTitle?: (id: string, title: string) => void
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
  sessionTitle,
  onSaveSessionTitle,
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

  const [isSavingTitle, setIsSavingTitle] = React.useState(false)

  const handleSaveTitle = React.useCallback(
    async (title: string) => {
      if (!activeSessionId || !kipAgentId) return
      setIsSavingTitle(true)
      try {
        await KipApi.updateSessionMetadata(kipAgentId, activeSessionId, { session_name: title })
        onSaveSessionTitle?.(activeSessionId, title)
      } finally {
        setIsSavingTitle(false)
      }
    },
    [activeSessionId, kipAgentId, onSaveSessionTitle],
  )

  const modelProvider = (domainFrame?.kip as any)?.model ?? null

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* ── Session Banner — stays above KeeperDialogFrame ────────────────── */}
      <div
        className="shrink-0 border-b"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-2">
          <SessionBannerCard
            sessionTitle={sessionTitle || "New session"}
            sessionId={activeSessionId}
            onSaveTitle={handleSaveTitle}
            isSavingTitle={isSavingTitle}
            journeyName={journeyName}
            keeperName={keeperName}
            modelProvider={modelProvider}
            soleActive={false}
            onOpenCockpit={() => {
              // TODO: open IDE CockpitPanel — wired, not yet built
            }}
          />
        </div>
      </div>

      {/* ── Shared Dialog Frame ───────────────────────────────────────────── */}
      <KeeperDialogFrame
        keeperName={keeperName}
        journeyName={journeyName}
        showServiceBar={true}
        onServiceOpen={onServiceOpen}
        cloudStatus="connected"
        railwayStatus="disconnected"
        vercelStatus="disconnected"
        githubStatus="disconnected"
        messages={messages}
        isSending={isSending}
        error={error}
        agentName="Kip"
        onOpenDraft={onSelectDraftInPlace}
        onOpenMoment={onMomentSelect}
        onOpenJourney={(journeyId) => onKipContextSync({ type: "journey", id: journeyId })}
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
