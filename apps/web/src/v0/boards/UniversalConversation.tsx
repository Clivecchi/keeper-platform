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
 *   - Computes agentContext once from useV0Shell()
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
import { useSelectionSessionResume } from "../../hooks/useSelectionSessionResume"
import { KeeperDialogFrame } from "../components/dialog/KeeperDialogFrame"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import { BOARD_DEFINITIONS } from "./UniversalBoardDefinition"
import type { UniversalBoardCenterProps } from "./UniversalBoard"
import { useUniversalBoard } from "./UniversalBoardContext"
import { useDesignerDraftOptional } from "./DesignerDraftContext"
import { FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../shell/frameRegistryMap"
import { loadDomainFrame } from "../data/loadDomainFrame"
import type { DomainFrameJson } from "../data/domain-frame.types"
import type { AgentDialogueMessage } from "../../components/agent/types"

type ToolSlug = "cloud" | "rendr"

interface SelectedAgentRecord {
  slug: string
  name: string
  purpose: string | null
}

const TOOL_DISPLAY_NAMES: Record<ToolSlug, string> = {
  cloud: "Cloud",
  rendr: "Rendr",
}

function pickMostRecentDialogSessionId(
  sessions: Array<{ id: string; updated_at?: string; created_at?: string }>,
): string | null {
  if (!sessions.length) return null
  const sorted = [...sessions].sort((a, b) => {
    const ta = Date.parse(String(a.updated_at ?? a.created_at ?? "")) || 0
    const tb = Date.parse(String(b.updated_at ?? b.created_at ?? "")) || 0
    return tb - ta
  })
  return sorted[0]?.id ?? null
}

function extractAgentReplyFromRunResult(result: unknown): string | null {
  const data = (result as { data?: Record<string, unknown> })?.data
  if (!data || typeof data !== "object") return null
  const nested = data.data as Record<string, unknown> | undefined
  const response =
    (typeof nested?.response === "string" && nested.response.trim()) ||
    (typeof data.response === "string" && data.response.trim()) ||
    null
  return response
}

function isThinkingPlaceholder(content: string, agentDisplayName: string): boolean {
  const trimmed = content.trim()
  return trimmed === `${agentDisplayName} is thinking…` || trimmed.endsWith(" is thinking…")
}

function lastAgentMessageFromRaw(messages: KipMessage[] | undefined): { id: string; content: string } | null {
  if (!messages?.length) return null
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if ((m.sender || m.role) === "user") continue
    const content = typeof m.content === "string" ? m.content.trim() : ""
    if (!content) continue
    return { id: m.id, content }
  }
  return null
}

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
  selectedDialogId,
  selectedJourneyId,
  selectedKeeperId,
  selectedDraftId,
  selectedAgentId,
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
  const agentEcho = def.conversation.agentEcho === true
  const defaultAgentSlug = def.conversation.agentSlug ?? "kip"
  const defaultAgentName = def.conversation.agentName ?? "Kip"
  const baseAgentSlug = defaultAgentSlug

  // ── designer mode: frame key + draft context ───────────────────────────────
  const { selection, actions } = useUniversalBoard()
  const boardSelectedAgentId = selection.selectedAgentId ?? selectedAgentId ?? null

  // Agent Board: resolve slug/name from the selected agent when it differs from the board default.
  const [selectedAgentRecord, setSelectedAgentRecord] = React.useState<SelectedAgentRecord | null>(null)

  React.useEffect(() => {
    if (kipMode !== "agent" || !boardSelectedAgentId) {
      setSelectedAgentRecord(null)
      return
    }
    let cancelled = false
    apiFetch(`/api/agents/${encodeURIComponent(boardSelectedAgentId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const agent =
          (res as SelectedAgentRecord & { agent?: SelectedAgentRecord })?.agent ??
          (res as { data?: SelectedAgentRecord })?.data ??
          (res as SelectedAgentRecord)
        const slug = typeof agent.slug === "string" ? agent.slug.trim() : ""
        const name = typeof agent.name === "string" ? agent.name.trim() : ""
        const purpose =
          typeof agent.purpose === "string" && agent.purpose.trim()
            ? agent.purpose.trim()
            : null
        if (slug && name) {
          setSelectedAgentRecord({ slug, name, purpose })
        } else {
          setSelectedAgentRecord(null)
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedAgentRecord(null)
      })
    return () => { cancelled = true }
  }, [kipMode, boardSelectedAgentId])

  const usingSelectedNonDefaultAgent =
    kipMode === "agent" &&
    !!boardSelectedAgentId &&
    !!selectedAgentRecord &&
    selectedAgentRecord.slug !== defaultAgentSlug

  // IDE mode: Cloud and Rendr invoke alternate agents into the Dialog.
  const [invokedToolSlug, setInvokedToolSlug] = React.useState<ToolSlug | null>(null)
  const effectiveAgentSlug =
    kipMode === "ide" && invokedToolSlug
      ? invokedToolSlug
      : usingSelectedNonDefaultAgent && selectedAgentRecord
        ? selectedAgentRecord.slug
        : baseAgentSlug
  const effectiveAgentDisplayName =
    kipMode === "ide" && invokedToolSlug
      ? TOOL_DISPLAY_NAMES[invokedToolSlug]
      : usingSelectedNonDefaultAgent && selectedAgentRecord
        ? selectedAgentRecord.name
        : def.conversation.agentName

  const selectedFrameKey = null
  const selectedBoardDefId = kipMode === "designer" ? (selection.selectedBoardDefId ?? null) : null
  const designerDraftCtx = useDesignerDraftOptional()

  // ── agentContext — computed once, shared across all modes ─────────────
  const agentContext = React.useMemo(() => {
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
  const [dialogTitle, setDialogTitle] = React.useState<string | null>(null)
  const [draftTitle, setDraftTitle] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!selectedDialogId || !domainId) { setDialogTitle(null); return }
    let cancelled = false
    apiFetch(
      `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(selectedDialogId)}`,
    )
      .then((res: unknown) => {
        if (cancelled) return
        const title = (res as { dialog?: { title?: string } })?.dialog?.title?.trim()
        setDialogTitle(title || null)
      })
      .catch(() => { if (!cancelled) setDialogTitle(null) })
    return () => { cancelled = true }
  }, [selectedDialogId, domainId])

  React.useEffect(() => {
    if (!selectedDraftId || !domainId) { setDraftTitle(null); return }
    let cancelled = false
    KipApi.getDraft(domainId, selectedDraftId)
      .then((d) => { if (!cancelled) setDraftTitle(d.title?.trim() || null) })
      .catch(() => { if (!cancelled) setDraftTitle(null) })
    return () => { cancelled = true }
  }, [selectedDraftId, domainId])

  React.useEffect(() => {
    if (!activeKeeperId) { setKeeperName(null); return }
    let cancelled = false
    const loadFromList = domainId
      ? apiFetch(`/api/keepers?domainId=${encodeURIComponent(domainId)}&limit=100`)
          .then((res: unknown) => {
            const list =
              (res as { data?: { keepers?: Array<{ id: string; title?: string }> } })?.data
                ?.keepers ?? []
            return list.find((k) => k.id === activeKeeperId)?.title?.trim() ?? null
          })
      : Promise.resolve(null)

    void loadFromList
      .then((fromList) => {
        if (cancelled) return
        if (fromList) { setKeeperName(fromList); return }
        return apiFetch(`/api/keepers/${encodeURIComponent(activeKeeperId)}`)
          .then((res: unknown) => {
            if (cancelled) return
            const k =
              (res as { keeper?: { title?: string } })?.keeper ??
              (res as { data?: { title?: string } })?.data
            setKeeperName((k as { title?: string } | undefined)?.title?.trim() || null)
          })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [activeKeeperId, domainId])

  React.useEffect(() => {
    if (!activeJourneyId) { setJourneyName(null); return }
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
  }, [activeJourneyId])

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
    (id: string | null) => { onSessionSelect(id) },
    [onSessionSelect],
  )

  // ── designer mode: draft proposal handler ─────────────────────────────────
  const handleDesignerDraft = React.useCallback(
    async (draft: { spec_json: unknown }, fKey: string) => {
      if (!designerDraftCtx || !domainId) return
      const frameBlock = draft.spec_json
      if (!frameBlock || typeof frameBlock !== "object") return

      const jsonKey = FRAME_TO_JSON_KEY[fKey] ?? null
      const base = designerDraftCtx.liveDomainFrame
        ? { ...(designerDraftCtx.liveDomainFrame as Record<string, unknown>) }
        : {}
      const fullSpec = jsonKey ? { ...base, [jsonKey]: frameBlock } : base

      designerDraftCtx.setDraftSpecJson(fullSpec as DomainFrameJson)
      designerDraftCtx.setPublishSuccess(false)

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
    [designerDraftCtx, domainId],
  )

  // ── Agent Board agent echo: echo agent + session (separate from primary agent session) ──
  const [echoAgentId, setEchoAgentId] = React.useState<string | null>(null)
  const [echoSessionId, setEchoSessionId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!agentEcho || kipMode !== "agent") {
      setEchoAgentId(null)
      return
    }
    let cancelled = false
    KipApi.getLeadAgent(defaultAgentSlug)
      .then((agent) => {
        if (!cancelled) setEchoAgentId(agent.id)
      })
      .catch(() => {
        if (!cancelled) setEchoAgentId(null)
      })
    return () => {
      cancelled = true
    }
  }, [agentEcho, kipMode, defaultAgentSlug])

  React.useEffect(() => {
    if (!agentEcho || kipMode !== "agent" || !echoAgentId || !domainId) {
      setEchoSessionId(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const sessions = await KipApi.getSessionsByAgentId(echoAgentId, { pageSize: 100 })
        if (cancelled) return
        const sorted = [...sessions].sort((a, b) => {
          const ta = Date.parse(String(a.updated_at ?? a.created_at ?? "")) || 0
          const tb = Date.parse(String(b.updated_at ?? b.created_at ?? "")) || 0
          return tb - ta
        })
        const existingId = sorted[0]?.id ?? null
        if (existingId) {
          setEchoSessionId(existingId)
          return
        }
        const session = await KipApi.createSession(echoAgentId, undefined, "Agent Board", {
          domainSlug: domainSlug ?? undefined,
          domainId,
          dialogBoard: "agent",
          dialogFrame: "conversation",
          dialogSubject: "domain",
          dialogScope: "keeper",
        })
        if (!cancelled) setEchoSessionId(session.id)
      } catch {
        if (!cancelled) setEchoSessionId(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [agentEcho, kipMode, echoAgentId, domainId, domainSlug])

  const setMessagesRef = React.useRef<React.Dispatch<React.SetStateAction<AgentDialogueMessage[]>> | null>(null)

  // ── ide / designer mode: post-run callbacks ───────────────────────────────
  const onAfterAgentRun = React.useCallback(
    (latestRaw: KipMessage[] | undefined, actionResults: unknown[] | undefined) => {
      if (kipMode === "designer" && selectedFrameKey) {
        if (Array.isArray(actionResults)) {
          for (const ar of actionResults) {
            const a = ar as {
              type?: string
              result?: { draft?: { id?: string; spec_json?: unknown } }
            }
            if (a.type === "draft.create" && a.result?.draft?.spec_json !== undefined) {
              void handleDesignerDraft(
                { spec_json: a.result.draft.spec_json },
                selectedFrameKey,
              )
              return
            }
          }
        }
        return
      }

      if (kipMode !== "ide") return

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
    [kipMode, selectedFrameKey, handleDesignerDraft, onDraftSelect, onJourneySelect, onMomentSelect],
  )

  const onAfterAgentRunWithEcho = React.useCallback(
    async (
      latestRaw: KipMessage[] | undefined,
      actionResults: unknown[] | undefined,
      result: unknown,
    ) => {
      void result
      if (kipMode === "ide" || kipMode === "designer") {
        onAfterAgentRun(latestRaw, actionResults)
      }

      if (!agentEcho || kipMode !== "agent") return
      if (effectiveAgentSlug === defaultAgentSlug) return
      if (!echoAgentId || !echoSessionId) return

      const agentReply = lastAgentMessageFromRaw(latestRaw)
      if (!agentReply?.content) return

      const echoInput =
        `[Echo context]\nAgent: ${effectiveAgentSlug}\nAgent response: ${agentReply.content}\n\n` +
        "Contribute a Dialog Response or return empty to stay silent."

      try {
        const echoResult = await KipApi.runAgent(
          echoAgentId,
          echoInput,
          undefined,
          echoSessionId,
          {
            domainSlug: domainSlug || undefined,
            domainId: domainId || undefined,
            mode: "domain",
            agentContext,
          },
        )
        const echoContent = extractAgentReplyFromRunResult(echoResult)?.trim()
        if (!echoContent || !setMessagesRef.current) return

        setMessagesRef.current((prev) => {
          let targetIdx = prev.findIndex((m) => m.id === agentReply.id)
          if (targetIdx < 0) {
            targetIdx = prev.findLastIndex(
              (m) => m.role === "agent" && !isThinkingPlaceholder(m.content, effectiveAgentDisplayName),
            )
          }
          if (targetIdx < 0) return prev
          const updated = [...prev]
          updated[targetIdx] = {
            ...updated[targetIdx],
            echo: {
              content: echoContent,
              attributedTo: defaultAgentName,
            },
          }
          return updated
        })
      } catch {
        /* Silence is valid — failed agent echo inference renders nothing */
      }
    },
    [
      kipMode,
      onAfterAgentRun,
      agentEcho,
      effectiveAgentSlug,
      defaultAgentSlug,
      echoAgentId,
      echoSessionId,
      domainSlug,
      domainId,
      agentContext,
      effectiveAgentDisplayName,
      defaultAgentName,
    ],
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
    fetchMessages,
  } = useAgentDialog({
    agentSlug: effectiveAgentSlug,
    resolvedAgentId:
      usingSelectedNonDefaultAgent && boardSelectedAgentId ? boardSelectedAgentId : undefined,
    agentDisplayName: effectiveAgentDisplayName,
    mode: kipMode,
    dialogBoard: kipMode === "designer" ? "designer" : undefined,
    dialogFrame: kipMode === "designer" ? (selectedFrameKey ?? undefined) : undefined,
    dialogSubject: kipMode === "designer" ? "frame" : undefined,
    domainSlug,
    domainId,
    agentContext,
    resolvedAudience: audience,
    refreshSession,
    frameCtx,
    activeJourneyId: kipMode === "ide" ? activeJourneyId : null,
    controlledSessionId: activeSessionId,
    onControlledSessionIdChange: handleSessionChange,
    onAfterAgentRun:
      kipMode === "ide" || kipMode === "designer" || (kipMode === "agent" && agentEcho)
        ? onAfterAgentRunWithEcho
        : undefined,
    frameKey: selectedFrameKey ?? undefined,
    manageSessionExternally: kipMode === "agent" && !!boardSelectedAgentId,
  })

  setMessagesRef.current = setMessages

  // ── useDraftContext — ide and agent modes ──────────────────────────────────
  useDraftContext({
    selectedDraftId: kipMode !== "domain" ? selectedDraftId : null,
    domainId,
    agentId,
    activeSessionId: dialogSessionId,
    onActiveSessionIdChange: handleSessionChange,
  })

  const idleMessages = React.useMemo<AgentDialogueMessage[]>(
    () =>
      kipMode === "ide"
        ? [{
            id: "kip-greeting",
            role: "agent",
            content: "I'm here. What are we building?",
            createdAt: new Date().toISOString(),
          }]
        : [],
    [kipMode],
  )

  useSelectionSessionResume({
    domainId,
    domainSlug,
    kipAgentId: agentId,
    kipMode,
    selectedDialogId,
    selectedJourneyId,
    selectedKeeperId,
    selectedDraftId,
    selectedAgentId: boardSelectedAgentId,
    activeSessionId: dialogSessionId,
    isSending,
    onSessionSelect: handleSessionChange,
    fetchMessages,
    setMessages,
    idleMessages,
  })

  // ── IDE mode: invoke Cloud / Rendr into the Dialog ───────────────────────
  const handleToolInvoke = React.useCallback(
    (tool: ToolSlug) => {
      setInvokedToolSlug((prev) => (prev === tool ? null : tool))
      handleSessionChange(null)
      setMessages(idleMessages)
    },
    [handleSessionChange, setMessages, idleMessages],
  )

  React.useEffect(() => {
    if (kipMode !== "ide" || !invokedToolSlug || !agentId) return
    let cancelled = false
    void (async () => {
      try {
        const sessions = await KipApi.getSessionsByAgentId(agentId, { pageSize: 50 })
        if (cancelled) return
        const sorted = [...sessions].sort((a, b) => {
          const ta = Date.parse(String(a.updated_at ?? a.created_at ?? "")) || 0
          const tb = Date.parse(String(b.updated_at ?? b.created_at ?? "")) || 0
          return tb - ta
        })
        const sessionId = sorted[0]?.id ?? null
        if (sessionId) {
          handleSessionChange(sessionId)
          await fetchMessages(sessionId)
        }
      } catch {
        /* fresh conversation with invoked agent */
      }
    })()
    return () => { cancelled = true }
  }, [kipMode, invokedToolSlug, agentId, handleSessionChange, fetchMessages])

  // ── designer mode: sync liveDomainFrame from shell to context ────────────
  React.useEffect(() => {
    if (kipMode !== "designer" || !designerDraftCtx) return
    if (domainFrame) designerDraftCtx.setLiveDomainFrame(domainFrame as DomainFrameJson)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kipMode, domainFrame])

  // ── designer mode: resume or create session per frame ─────────────────────
  React.useEffect(() => {
    if (kipMode !== "designer") return
    if (designerDraftCtx) {
      designerDraftCtx.setDraftSpecJson(null)
      designerDraftCtx.setDraftId(null)
      designerDraftCtx.setPublishSuccess(false)
    }

    if (!domainId || !selectedFrameKey || !agentId) {
      handleSessionChange(null)
      setMessages([])
      return
    }

    let cancelled = false
    const frameKey = selectedFrameKey
    const aid = agentId

    void (async () => {
      try {
        const res = (await apiFetch(
          `/api/domains/${domainId}/kip/dialogs/resolve/active?board=designer&frame=${encodeURIComponent(frameKey)}&available_to=admin`,
        )) as { dialog?: { sessions?: Array<{ id: string; updated_at?: string; created_at?: string }> } }

        if (cancelled) return

        const sessionId = pickMostRecentDialogSessionId(res.dialog?.sessions ?? [])
        if (sessionId) {
          handleSessionChange(sessionId)
          await fetchMessages(sessionId)
          return
        }

        const frameDisplayName = FRAME_DISPLAY_NAMES[frameKey] ?? frameKey
        const session = await KipApi.createSession(aid, undefined, frameDisplayName, {
          domainSlug,
          domainId,
          dialogBoard: "designer",
          dialogFrame: frameKey,
          dialogSubject: "frame",
          dialogScope: "admin",
        })
        if (cancelled) return
        handleSessionChange(session.id)
        setMessages([])
      } catch {
        if (!cancelled) {
          handleSessionChange(null)
          setMessages([])
        }
      }
    })()

    return () => { cancelled = true }
  }, [
    kipMode,
    selectedFrameKey,
    domainId,
    domainSlug,
    agentId,
    designerDraftCtx,
    handleSessionChange,
    fetchMessages,
    setMessages,
  ])

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
    if (selectedDialogId) {
      return {
        primary: dialogTitle ?? "Dialog",
        secondary: domainName || undefined,
        sessionLabel: "Session" as const,
      }
    }
    if (selectedJourneyId) {
      return {
        primary: journeyName ?? "Journey",
        secondary: keeperName ?? domainName ?? undefined,
        sessionLabel: "Session" as const,
      }
    }
    if (selectedKeeperId) {
      return {
        primary: keeperName ?? "Keeper",
        secondary: domainName || undefined,
        sessionLabel: "Session" as const,
      }
    }
    if (selectedDraftId) {
      return {
        primary: draftTitle ?? "Draft",
        secondary: domainName || undefined,
        sessionLabel: "Session" as const,
      }
    }
    if (selectedAgentId && kipMode !== "agent") {
      return {
        primary: selectedAgentRecord?.name ?? def.conversation.agentName,
        secondary: "Agent",
        sessionLabel: "Session" as const,
      }
    }

    switch (kipMode) {
      case "ide":
        return {
          primary: invokedToolSlug
            ? TOOL_DISPLAY_NAMES[invokedToolSlug]
            : (keeperName ?? domainName ?? ""),
          secondary: invokedToolSlug
            ? "Tool"
            : (journeyName ?? undefined),
          sessionLabel: "Session" as const,
        }
      case "agent":
        if (usingSelectedNonDefaultAgent && selectedAgentRecord) {
          return {
            primary: selectedAgentRecord.name,
            secondary: def.displayName,
            ...(selectedAgentRecord.purpose ? { prelude: selectedAgentRecord.purpose } : {}),
            sessionLabel: "Session" as const,
          }
        }
        return {
          primary: selectedDraftId ? "Draft" : "Conversation",
          secondary: "Agent Studio",
        }
      case "designer": {
        const boardDefLabel = selectedBoardDefId
          ? (BOARD_DEFINITIONS[selectedBoardDefId]?.displayName ?? selectedBoardDefId)
          : null
        return {
          primary: "Design",
          secondary: selectedFrameKey
            ? (FRAME_DISPLAY_NAMES[selectedFrameKey] ?? selectedFrameKey)
            : boardDefLabel ?? "Select a frame",
          ...(hasDraftSpec ? { prelude: "Draft in progress" } : {}),
        }
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
  }, [
    kipMode,
    keeperName,
    journeyName,
    domainName,
    selectedDialogId,
    selectedJourneyId,
    selectedKeeperId,
    selectedDraftId,
    selectedAgentId,
    dialogTitle,
    draftTitle,
    selectedAgentRecord,
    def.conversation.agentName,
    def.displayName,
    usingSelectedNonDefaultAgent,
    domainFrame,
    selectedFrameKey,
    selectedBoardDefId,
    hasDraftSpec,
    invokedToolSlug,
    journeyCount,
    momentCount,
  ])

  // ── modelProvider — ide mode reads from domain frame ──────────────────────
  const modelProvider = kipMode === "ide"
    ? ((domainFrame as { kip?: { model?: string } } | null)?.kip?.model ?? null)
    : null

  // Composer gate: requires a resolved agent id (Lead via slug lookup, or nav-selected id).
  const dialogAgentId =
    agentId ??
    (usingSelectedNonDefaultAgent && boardSelectedAgentId ? boardSelectedAgentId : null)
  const composerDisabled =
    !dialogAgentId || (kipMode === "designer" && !selectedFrameKey)

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
        onServiceOpen={kipMode === "ide" ? (service) => onServiceOpen(service ?? "vercel") : undefined}
        onToolInvoke={kipMode === "ide" ? handleToolInvoke : undefined}
        activeToolSlug={kipMode === "ide" ? invokedToolSlug : null}
        messages={messages}
        isSending={isSending}
        error={error}
        agentName={effectiveAgentDisplayName}
        echoAgentName={defaultAgentName}
        onOpenDraft={onDraftSelect}
        onOpenMoment={kipMode === "ide" ? onMomentSelect : undefined}
        onOpenJourney={kipMode === "ide" ? (id) => onJourneySelect(id) : undefined}
        agentBubbleFullWidth={kipMode !== "ide"}
        agentId={dialogAgentId}
        domainId={domainId ?? null}
        dialogueMode={def.conversation.dialogueMode === "domain" ? "domain" : undefined}
        inputValue={input}
        onInputChange={setInput}
        onSubmit={sendMessage}
        onFileAttach={(text) => setInput((prev) => (prev ? `${prev}\n\n${text}` : text))}
        activeSessionId={dialogSessionId}
        disabled={composerDisabled}
      />
    </div>
  )
}
