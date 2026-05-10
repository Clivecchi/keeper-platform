"use client"

/**
 * UniversalConversation
 * =====================
 * KE3P · Keeper Platform · Universal Board — Center Panel
 *
 * One render file for all conversation boards.
 * useAgentDialog handles all conversation lifecycle.
 *
 * This file:
 *   - Computes experienceContext once from useV0Shell()
 *   - Calls useAgentDialog with parameters from def.conversation
 *   - Branches on def.conversation.kipMode only for banner props
 *     and the three ide-mode callbacks
 *   - Calls useDraftContext for ide and agent modes
 *   - Renders KeeperDialogFrame once
 *
 * Modes:
 *   "ide"    — keeper + journey banner, Kip context sync, session title save,
 *              service bar, draft-session linking
 *   "agent"  — agent studio banner, draft context
 *   "domain" — domain banner + DomainBanner header
 */

import * as React from "react"
import type { KipMessage } from "../../lib/kipApi"
import { KipApi } from "../../lib/kipApi"
import { apiFetch } from "../../lib/api"
import { getApiBase } from "../../lib/apiFetch"
import { useV0Shell } from "../shell/V0ShellContext"
import { useFrameContextOptional } from "../shell/FrameContext"
import { useAuth } from "../../context/AuthContext"
import { extractLinkedCard } from "../../components/agent/helpers"
import { useAgentDialog } from "../../hooks/useAgentDialog"
import { useDraftContext } from "../../hooks/useDraftContext"
import { KeeperDialogFrame } from "../components/dialog/KeeperDialogFrame"
import { DomainBanner } from "../components/DomainBanner"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import type { UniversalBoardCenterProps } from "./UniversalBoard"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UniversalConversationProps extends UniversalBoardCenterProps {
  def: UniversalBoardDef
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UniversalConversation({
  def,
  domainSlug,
  domainId,
  domainName,
  activeSessionId,
  selectedJourneyId,
  selectedKeeperId,
  selectedDraftId,
  onSessionSelect,
  onJourneySelect,
  onMomentSelect,
  onDraftSelect,
  onServiceOpen,
}: UniversalConversationProps) {
  const { domainFrame, resolvedAudience: shellAudience } = useV0Shell()
  const frameCtx = useFrameContextOptional()
  const { refreshSession } = useAuth()
  const audience = shellAudience ?? "keeper"
  const kipMode = def.conversation.kipMode

  // ── experienceContext — computed once, shared across all modes ─────────────
  const experienceContext = React.useMemo(() => {
    if (!domainFrame) return undefined
    return {
      audience,
      model: domainFrame.kip.model,
      forward: domainFrame.forward,
      directions: domainFrame.directions.filter((d) => d.available_to.includes(audience)),
      kip_context: domainFrame.kip_context[audience] ?? "",
    }
  }, [domainFrame, audience])

  // ── ide mode: resolved names for banner ───────────────────────────────────
  const activeKeeperId = selectedKeeperId ?? frameCtx?.selection?.activeKeeperId ?? null
  const activeJourneyId = selectedJourneyId ?? frameCtx?.selection?.activeJourneyId ?? null

  const [keeperName, setKeeperName] = React.useState<string | null>(null)
  const [journeyName, setJourneyName] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (kipMode !== "ide" || !activeKeeperId) { setKeeperName(null); return }
    let cancelled = false
    apiFetch(`/api/keepers/${encodeURIComponent(activeKeeperId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const k = (res as { keeper?: { title?: string }; data?: { title?: string } })?.keeper
          ?? (res as { data?: { title?: string } })?.data
        setKeeperName((k as { title?: string } | undefined)?.title?.trim() || null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [kipMode, activeKeeperId])

  React.useEffect(() => {
    if (kipMode !== "ide" || !activeJourneyId) { setJourneyName(null); return }
    let cancelled = false
    apiFetch(`/api/journeys/${encodeURIComponent(activeJourneyId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const j = (res as { journey?: { name?: string }; data?: { name?: string } })?.journey
          ?? (res as { data?: { name?: string } })?.data
        setJourneyName((j as { name?: string } | undefined)?.name?.trim() || null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [kipMode, activeJourneyId])

  // ── domain mode: counts for DomainBanner ──────────────────────────────────
  const [journeyCount, setJourneyCount] = React.useState<number | null>(null)
  const [momentCount, setMomentCount] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (kipMode !== "domain" || !domainSlug) return
    let cancelled = false
    const base = getApiBase()
    fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { journeys?: unknown[] }) => {
        if (!cancelled) setJourneyCount(Array.isArray(json?.journeys) ? json.journeys.length : 0)
      })
      .catch(() => { if (!cancelled) setJourneyCount(null) })
    return () => { cancelled = true }
  }, [kipMode, domainSlug])

  React.useEffect(() => {
    if (kipMode !== "domain" || !domainSlug) return
    let cancelled = false
    apiFetch(`/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&status=kept&limit=500`)
      .then((json: unknown) => {
        if (!cancelled) {
          const n = Array.isArray((json as { data?: unknown[] })?.data)
            ? (json as { data: unknown[] }).data.length
            : 0
          setMomentCount(n >= 500 ? 500 : n)
        }
      })
      .catch(() => { if (!cancelled) setMomentCount(null) })
    return () => { cancelled = true }
  }, [kipMode, domainSlug])

  // ── Adapter: hooks require (string | null) but centerProps callbacks take (string) ──
  const handleSessionChange = React.useCallback(
    (id: string | null) => { if (id !== null) onSessionSelect(id) },
    [onSessionSelect],
  )

  // ── ide mode: Kip context sync → board selection callbacks ────────────────
  const onAfterAgentRun = React.useCallback(
    (latestRaw: KipMessage[] | undefined, actionResults: unknown[] | undefined) => {
      if (Array.isArray(actionResults)) {
        for (const ar of actionResults) {
          const a = ar as { type?: string; result?: { draft?: { id: string } } }
          if (a.type === "draft.create" && a.result?.draft?.id) {
            onDraftSelect(a.result.draft.id)
            return
          }
        }
      }
      if (!latestRaw?.length) return
      for (let i = latestRaw.length - 1; i >= 0; i--) {
        const m = latestRaw[i]
        if ((m.sender || m.role) === "user") continue
        const linked = extractLinkedCard(m.metadata)
        if (linked) {
          if (linked.entityType === "journey") { onJourneySelect(linked.entityId); return }
          if (linked.entityType === "moment") { onMomentSelect(linked.entityId); return }
          if ((linked.entityType as string) === "draft") { onDraftSelect(linked.entityId); return }
        }
        return
      }
    },
    [onDraftSelect, onJourneySelect, onMomentSelect],
  )

  // ── useAgentDialog — conversation lifecycle ───────────────────────────────
  const {
    messages,
    input,
    setInput,
    isSending,
    error,
    agentId,
    activeSessionId: dialogSessionId,
    sendMessage,
  } = useAgentDialog({
    agentSlug: "kip",
    agentDisplayName: def.conversation.agentName,
    mode: kipMode,
    domainSlug,
    domainId,
    experienceContext,
    resolvedAudience: audience,
    refreshSession,
    frameCtx,
    activeJourneyId: kipMode === "ide" ? activeJourneyId : null,
    controlledSessionId: kipMode === "ide" ? activeSessionId : undefined,
    onControlledSessionIdChange: kipMode === "ide" ? handleSessionChange : undefined,
    onAfterAgentRun: kipMode === "ide" ? onAfterAgentRun : undefined,
  })

  // ── useDraftContext — ide and agent modes ──────────────────────────────────
  useDraftContext({
    selectedDraftId: kipMode !== "domain" ? selectedDraftId : null,
    domainId,
    agentId,
    activeSessionId: dialogSessionId,
    onActiveSessionIdChange: kipMode === "ide" ? handleSessionChange : undefined,
  })

  // ── ide mode: session title save ──────────────────────────────────────────
  const handleSaveTitle = React.useCallback(
    async (title: string) => {
      if (!dialogSessionId || !agentId) return
      try {
        await KipApi.updateSessionMetadata(agentId, dialogSessionId, { session_name: title })
      } catch {
        // best-effort — title save does not block the conversation
      }
    },
    [dialogSessionId, agentId],
  )

  // ── Banner props — the only mode branch ───────────────────────────────────
  const bannerContext = React.useMemo(() => {
    switch (kipMode) {
      case "ide":
        return {
          primary: keeperName ?? domainName ?? "",
          secondary: journeyName ?? undefined,
          sessionLabel: "Session" as const,
        }
      case "agent":
        return {
          primary: selectedDraftId ? "Draft" : "Conversation",
          secondary: "Agent Studio",
        }
      case "domain":
      default:
        return {
          primary: (domainFrame as { theme?: { wordmark?: string } } | null)?.theme?.wordmark?.trim()
            || domainName
            || "Domain",
        }
    }
  }, [kipMode, keeperName, journeyName, domainName, selectedDraftId, domainFrame])

  // ── modelProvider — ide mode reads from domain frame ──────────────────────
  const modelProvider = kipMode === "ide"
    ? ((domainFrame as { kip?: { model?: string } } | null)?.kip?.model ?? null)
    : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* DomainBanner — domain mode only, above the dialog frame */}
      {kipMode === "domain" && (
        <DomainBanner
          domainFrame={domainFrame}
          fallbackWordmark={domainSlug || domainName || "—"}
          journeyCount={journeyCount}
          momentCount={momentCount}
        />
      )}

      <KeeperDialogFrame
        bannerContext={bannerContext}
        sessionId={dialogSessionId}
        soleActive={false}
        modelProvider={modelProvider}
        onSaveTitle={kipMode === "ide" ? handleSaveTitle : undefined}
        showServiceBar={def.conversation.showServiceBar}
        onServiceOpen={kipMode === "ide" ? (service) => onServiceOpen(service ?? "cloud") : undefined}
        messages={messages}
        isSending={isSending}
        error={error}
        agentName={def.conversation.agentName}
        onOpenDraft={onDraftSelect}
        onOpenMoment={kipMode === "ide" ? onMomentSelect : undefined}
        onOpenJourney={kipMode === "ide" ? (id) => onJourneySelect(id) : undefined}
        agentBubbleFullWidth={kipMode !== "ide"}
        agentId={agentId}
        domainId={domainId ?? null}
        dialogueMode={def.conversation.dialogueMode === "domain" ? "domain" : undefined}
        inputValue={input}
        onInputChange={setInput}
        onSubmit={sendMessage}
        onFileAttach={(text) => setInput((prev) => (prev ? `${prev}\n\n${text}` : text))}
        activeSessionId={dialogSessionId}
        disabled={!agentId}
      />
    </div>
  )
}
