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
 *   "domain" — domain identity (wordmark, tagline, live pulse, counts) via bannerContext → KeeperDialogFrame
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
import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import type { UniversalBoardCenterProps } from "./UniversalBoard"
import { useUniversalBoard } from "./UniversalBoardContext"
import { useDesignerDraftOptional } from "./DesignerDraftContext"
import { FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../shell/frameRegistryMap"
import { loadDomainFrame } from "../data/loadDomainFrame"
import type { DomainFrameJson } from "../data/domain-frame.types"
import type { AgentDialogueMessage } from "../../components/agent/types"

// Local alias used in the dialog-restore effect to build message objects inline.
type AgentDialogueMessageLocal = AgentDialogueMessage

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UniversalConversationProps extends UniversalBoardCenterProps {
  def: UniversalBoardDef
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── DraftBar ─────────────────────────────────────────────────────────────────
// Rendered in the designer branch above KeeperDialogFrame.

function DraftBar({
  hasDraftSpec,
  publishSuccess,
  draftId,
  isPublishing,
  onPublish,
}: {
  hasDraftSpec: boolean
  publishSuccess: boolean
  draftId: string | null
  isPublishing: boolean
  onPublish: () => void
}) {
  if (!hasDraftSpec && !publishSuccess) return null
  return (
    <div
      className="shrink-0 px-4 py-2.5 border-b flex items-center justify-between gap-3"
      style={{
        borderColor: publishSuccess
          ? "hsl(var(--theme-status-success, 152 69% 43%) / 0.3)"
          : "hsl(var(--theme-status-warning, 38 92% 50%) / 0.3)",
        background: publishSuccess
          ? "hsl(var(--theme-status-success, 152 69% 43%) / 0.08)"
          : "hsl(var(--theme-status-warning, 38 92% 50%) / 0.08)",
      }}
    >
      <p
        className="text-[12px] font-medium"
        style={{
          color: publishSuccess
            ? "hsl(var(--theme-status-success, 152 69% 28%))"
            : "hsl(var(--theme-status-warning, 38 92% 32%))",
        }}
      >
        {publishSuccess
          ? "✓ Published — live platform updated"
          : draftId
            ? "Draft ready — review preview in the right panel, then publish"
            : "Edit staged — review preview in the right panel, then publish"}
      </p>
      {hasDraftSpec && !publishSuccess && (
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity disabled:opacity-50 shrink-0"
          style={{
            background: "hsl(var(--theme-ink-primary))",
            color: "hsl(var(--theme-surface-paper))",
          }}
        >
          {isPublishing ? "Publishing…" : "Publish"}
        </button>
      )}
    </div>
  )
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

  // ── designer mode: frame key + draft context ───────────────────────────────
  const { selection, actions } = useUniversalBoard()
  const selectedFrameKey = kipMode === "designer" ? (selection.selectedFrameKey ?? null) : null
  const designerDraftCtx = useDesignerDraftOptional()

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

  // ── designer mode: onDesignerDraft — creates draft record + updates context ─
  // Declared before useAgentDialog so it can be passed as a stable callback.
  // Uses designerDraftCtx and domainId from the outer scope via closure.
  const handleDesignerDraft = React.useCallback(
    async (draft: { spec_json: unknown }, fKey: string) => {
      if (!designerDraftCtx || !domainId) return
      const frameBlock = draft.spec_json
      if (!frameBlock || typeof frameBlock !== "object") return

      // Build the full DomainFrameJson by merging the frame block into the live spec.
      const jsonKey = FRAME_TO_JSON_KEY[fKey] ?? null
      const base = designerDraftCtx.liveDomainFrame
        ? { ...(designerDraftCtx.liveDomainFrame as Record<string, unknown>) }
        : {}
      const fullSpec = jsonKey ? { ...base, [jsonKey]: frameBlock } : base

      // Update preview immediately so the right panel reflects the change.
      designerDraftCtx.setDraftSpecJson(fullSpec as DomainFrameJson)
      designerDraftCtx.setPublishSuccess(false)

      // Create the draft record. Failure is non-fatal — preview stays active.
      try {
        const frameDisplayName = FRAME_DISPLAY_NAMES[fKey] ?? fKey
        const d = await KipApi.createDraft(domainId, {
          kind: "domain_json",
          key: `designer-${fKey}-${Date.now()}`,
          title: `${frameDisplayName} proposal`,
          spec: fullSpec as Record<string, unknown>,
        })
        designerDraftCtx.setDraftId(d.id)
      } catch (err) {
        console.error("[UniversalConversation] auto-create draft failed:", err)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [designerDraftCtx, domainId],
  )

  // ── designer mode: publish handler ────────────────────────────────────────
  const handlePublish = React.useCallback(async () => {
    if (!designerDraftCtx || !domainId || designerDraftCtx.isPublishing || !designerDraftCtx.draftSpecJson) return
    designerDraftCtx.setIsPublishing(true)
    try {
      let resolvedDraftId = designerDraftCtx.draftId
      if (!resolvedDraftId) {
        const d = await KipApi.createDraft(domainId, {
          kind: "domain_json",
          key: `direct-edit-${Date.now()}`,
          title: "Direct edit",
          spec: designerDraftCtx.draftSpecJson as unknown as Record<string, unknown>,
        })
        resolvedDraftId = d.id
        designerDraftCtx.setDraftId(resolvedDraftId)
      }
      await KipApi.updateDraft(domainId, resolvedDraftId, {
        spec: designerDraftCtx.draftSpecJson as unknown as Record<string, unknown>,
      })
      await KipApi.publishDraft(domainId, resolvedDraftId)
      designerDraftCtx.setPublishSuccess(true)
      designerDraftCtx.setDraftSpecJson(null)
      designerDraftCtx.setDraftId(null)
      if (domainSlug) {
        try {
          const reloaded = await loadDomainFrame(domainSlug)
          designerDraftCtx.setLiveDomainFrame(reloaded)
        } catch {
          // non-fatal — live frame stays stale until next navigation
        }
      }
      setTimeout(() => designerDraftCtx.setPublishSuccess(false), 3000)
    } catch (err) {
      console.error("[UniversalConversation] publish failed:", err)
    } finally {
      designerDraftCtx.setIsPublishing(false)
    }
  }, [designerDraftCtx, domainId, domainSlug])

  // ── useAgentDialog — conversation lifecycle ───────────────────────────────
  const {
    messages,
    setMessages,
    input,
    setInput,
    isSending,
    error,
    agentId,
    activeSessionId: dialogSessionId,
    sendMessage,
    clearDesignerDialog,
    setDesignerDialogId,
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
    frameKey: selectedFrameKey ?? undefined,
    onDesignerDraft: kipMode === "designer" ? handleDesignerDraft : undefined,
  })

  // ── useDraftContext — ide and agent modes ──────────────────────────────────
  useDraftContext({
    selectedDraftId: kipMode !== "domain" ? selectedDraftId : null,
    domainId,
    agentId,
    activeSessionId: dialogSessionId,
    onActiveSessionIdChange: kipMode === "ide" ? handleSessionChange : undefined,
  })

  // ── designer mode: sync liveDomainFrame from shell to context ────────────
  React.useEffect(() => {
    if (kipMode !== "designer" || !designerDraftCtx) return
    if (domainFrame) designerDraftCtx.setLiveDomainFrame(domainFrame as DomainFrameJson)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kipMode, domainFrame])

  // ── designer mode: reset conversation + draft state on frame change ────────
  React.useEffect(() => {
    if (kipMode !== "designer") return
    setMessages([])
    clearDesignerDialog()
    if (designerDraftCtx) {
      designerDraftCtx.setDraftSpecJson(null)
      designerDraftCtx.setDraftId(null)
      designerDraftCtx.setPublishSuccess(false)
    }

    if (!domainId || !selectedFrameKey) return
    let cancelled = false

    apiFetch(
      `/api/domains/${domainId}/kip/dialogs/resolve/active?board=designer&frame=${encodeURIComponent(selectedFrameKey)}&available_to=admin`,
    )
      .then((res: unknown) => {
        if (cancelled) return
        const dialog = (res as { dialog?: { id?: string; sessions?: unknown[] } })?.dialog
        if (!dialog?.id) return

        setDesignerDialogId(dialog.id)

        const loaded: AgentDialogueMessageLocal[] = []
        const sessions = (dialog.sessions ?? []) as Array<{
          kip_messages?: Array<{ id: string; role: string; content: string }>
        }>
        for (const session of sessions) {
          for (const msg of session.kip_messages ?? []) {
            loaded.push({
              id: msg.id,
              role: msg.role === "assistant" ? "agent" : "user",
              content: msg.content,
              createdAt: new Date().toISOString(),
            })
          }
        }
        if (loaded.length > 0) setMessages(loaded)
      })
      .catch(() => {
        // Non-critical — start fresh if resolve fails
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kipMode, selectedFrameKey, domainId])

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
  const hasDraftSpec = designerDraftCtx ? designerDraftCtx.draftSpecJson !== null : false

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
      case "designer":
        return {
          primary: "Design",
          secondary: selectedFrameKey
            ? (FRAME_DISPLAY_NAMES[selectedFrameKey] ?? selectedFrameKey)
            : "Select a frame",
          ...(hasDraftSpec ? { prelude: "Draft in progress" } : {}),
        }
      case "domain":
      default: {
        const df = domainFrame as {
          theme?: { wordmark?: string; tagline?: string; colors?: { primary?: string } }
          cover?: { card?: { tagLine?: string } }
        } | null
        const wordmark = df?.theme?.wordmark?.trim() || domainName || "Domain"
        const tagline = df?.cover?.card?.tagLine?.trim() || df?.theme?.tagline?.trim() || undefined
        const primaryAccent = df?.theme?.colors?.primary?.trim() || undefined
        const statJourneys = journeyCount === null ? "—" : String(journeyCount)
        const statMoments = momentCount === null ? "—" : momentCount >= 500 ? "500+" : String(momentCount)
        return {
          primary: wordmark,
          ...(tagline ? { tagline } : {}),
          livePulse: { color: primaryAccent },
          stats: [
            { label: "Journeys", value: statJourneys },
            { label: "Moments", value: statMoments },
          ] as const,
        }
      }
    }
  }, [kipMode, keeperName, journeyName, domainName, selectedDraftId, domainFrame, selectedFrameKey, hasDraftSpec, journeyCount, momentCount])

  // ── modelProvider — ide mode reads from domain frame ──────────────────────
  const modelProvider = kipMode === "ide"
    ? ((domainFrame as { kip?: { model?: string } } | null)?.kip?.model ?? null)
    : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* DraftBar — designer mode only, above the dialog frame */}
      {kipMode === "designer" && designerDraftCtx && (
        <DraftBar
          hasDraftSpec={hasDraftSpec}
          publishSuccess={designerDraftCtx.publishSuccess}
          draftId={designerDraftCtx.draftId}
          isPublishing={designerDraftCtx.isPublishing}
          onPublish={handlePublish}
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
        disabled={!agentId || (kipMode === "designer" && !selectedFrameKey)}
      />
    </div>
  )
}
