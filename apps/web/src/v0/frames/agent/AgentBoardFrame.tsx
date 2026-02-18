"use client"

/**
 * AgentBoardFrame
 *
 * The new composable Agent Board frame, built on the same primitives as the
 * refactored Commons Frame (SidebarWorkspaceLayout, SidebarCard, WorkspaceHeader,
 * useAgentWorkspaceView).
 *
 * Sidebar: Drafts, Journeys, Keepers, Sessions, For you.
 *
 * Workspace views:
 *   - dialogue: Live conversation with the domain agent
 *   - draft:    Draft editor/viewer
 *   - cockpit:  Agent configuration and diagnostics
 *
 * The agent name is dynamic — loaded from the API, never hardcoded.
 */

import * as React from "react"
import { PaperAirplaneIcon, PaperClipIcon } from "@heroicons/react/24/outline"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useAuth } from "../../../context/AuthContext"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"
import type { KipAgent, KipDraftSummary, KipDraft, KipDraftStatus, KipMessage, ActionPack } from "../../../lib/kipApi"
import { useAgentSessions } from "../../../hooks/useAgentSessions"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { useAgentWorkspaceView } from "../../shell/useAgentWorkspaceView"
import { SidebarCard } from "../../components/SidebarCard"
import type { SidebarCardItem } from "../../components/SidebarCard"
import { WorkspaceHeader } from "../../components/WorkspaceHeader"
import { SidebarWorkspaceLayout } from "../../components/SidebarWorkspaceLayout"
import { PromptedActionCard } from "../../components/PromptedActionCard"
import type { PromptedAction } from "../../components/PromptedActionCard"
import { DialogueMessageList } from "../../../components/agent/DialogueMessageList"
import { CockpitPanel } from "../../../components/agent/CockpitPanel"
import { AgentContextBar } from "../../../components/agent/AgentContextBar"
import { AgentContextBanner } from "../../../components/agent/AgentContextBanner"
import { DraftCard } from "../../../components/agent/DraftCard"
import type { DraftSpec } from "../../../components/agent/DraftCard"
import { JourneyCard } from "../../../components/agent/JourneyCard"
import type { JourneyDetail } from "../../../components/agent/JourneyCard"
import { KeeperCard } from "../../../components/agent/KeeperCard"
import type { KeeperDetail } from "../../../components/agent/KeeperCard"
import type { AgentDialogueMessage } from "../../../components/agent/types"
import { useAgentPostureData } from "../../../hooks/useAgentPostureData"
import { normalizeActionReceipt } from "../../../components/agent/types"
import { shortId, extractLinkedCard } from "../../../components/agent/helpers"

// =============================================================================
// Types
// =============================================================================

type JourneySummary = {
  id: string
  name: string
  forward?: string | null
  momentCount?: number
}

type KeeperSummary = {
  id: string
  title: string
  purpose?: string | null
}

// =============================================================================
// Helpers
// =============================================================================

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

function makeDraftKey(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${slug || "draft"}-${suffix}`
}

// =============================================================================
// Component
// =============================================================================

export function AgentBoardFrame({
  styleId = "neutral",
  themeSlug,
}: {
  styleId?: StyleId
  themeSlug?: string | null
}) {
  const { domainSlug, navigateToFrame } = useV0Shell()
  const frameCtx = useFrameContextOptional()
  const { isAuthenticated, isAdmin, refreshSession } = useAuth()
  const [view, setView] = useAgentWorkspaceView()

  // ── Agent state ──
  const [agent, setAgent] = React.useState<KipAgent | null>(null)
  const [agentError, setAgentError] = React.useState<string | null>(null)
  const [isAgentLoading, setIsAgentLoading] = React.useState(true)

  // ── Domain data ──
  const [domainId, setDomainId] = React.useState<string | null>(frameCtx?.domain?.id ?? null)
  const [journeys, setJourneys] = React.useState<JourneySummary[]>([])
  const [keepers, setKeepers] = React.useState<KeeperSummary[]>([])

  // ── Dialogue state ──
  const [messages, setMessages] = React.useState<AgentDialogueMessage[]>([])
  const [messagesError, setMessagesError] = React.useState<string | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  // ── Action pack (tools the agent can use) ──
  const [allowedActions, setAllowedActions] = React.useState<string[]>([])
  const [soleStatus, setSoleStatus] = React.useState<{
    soleActive: boolean
    keeperSharpening?: boolean
    memoryCount?: number
  } | null>(null)
  const [composedSystemPrompt, setComposedSystemPrompt] = React.useState<string | null>(null)

  // ── Draft state ──
  const [drafts, setDrafts] = React.useState<KipDraftSummary[]>([])
  const [draftDetail, setDraftDetail] = React.useState<KipDraft | null>(null)
  const [isLoadingDrafts, setIsLoadingDrafts] = React.useState(false)
  const [isSavingDraft, setIsSavingDraft] = React.useState(false)
  const [isCreatingDraft, setIsCreatingDraft] = React.useState(false)
  const [draftsError, setDraftsError] = React.useState<string | null>(null)

  // ── Journey/Keeper detail (for workspace view) ──
  const [journeyDetail, setJourneyDetail] = React.useState<JourneyDetail | null>(null)
  const [keeperDetail, setKeeperDetail] = React.useState<KeeperDetail | null>(null)
  const [isLoadingJourneyDetail, setIsLoadingJourneyDetail] = React.useState(false)
  const [isLoadingKeeperDetail, setIsLoadingKeeperDetail] = React.useState(false)

  // ── Sessions ──
  const {
    sessions,
    isLoading: isSessionsLoading,
    error: sessionsError,
    refresh: refreshSessions,
    createSession,
  } = useAgentSessions(agent?.id)

  // Active session: from URL view or first session
  const activeSessionId =
    (view.kind === "dialogue" ? view.sessionId : undefined) ??
    (sessions.length ? sessions[0].id : null)

  // ── Sync domain from FrameContext ──
  React.useEffect(() => {
    if (frameCtx?.domain?.id && !frameCtx.domain.id.startsWith("fallback-")) {
      setDomainId(frameCtx.domain.id)
    }
  }, [frameCtx?.domain?.id])

  // ── Load agent ──
  React.useEffect(() => {
    let active = true
    setIsAgentLoading(true)
    setAgentError(null)
    KipApi.getLeadAgent("kip")
      .then((data) => {
        if (!active) return
        setAgent(data)
      })
      .catch((err) => {
        if (!active) return
        setAgentError(err instanceof Error ? err.message : "Unable to load agent")
      })
      .finally(() => {
        if (active) setIsAgentLoading(false)
      })
    return () => { active = false }
  }, [isAuthenticated])

  // ── Load action pack (tools the agent can use) + composed system prompt ──
  React.useEffect(() => {
    if (!agent?.id || !domainId) return
    let active = true
    const keeperId = frameCtx?.selection.activeKeeperId ?? null
    const journeyId = frameCtx?.selection.activeJourneyId ?? null
    KipApi.getActionPack(agent.id, domainId, keeperId, {
      journeyId,
      composePrompt: true,
    })
      .then(({ allowedActions: actions, soleStatus: ss, composedSystemPrompt: prompt }) => {
        if (!active) return
        setAllowedActions(actions)
        setSoleStatus(ss ?? null)
        if (typeof prompt === "string") setComposedSystemPrompt(prompt)
      })
      .catch(() => { /* ignore */ })
    return () => { active = false }
  }, [agent?.id, domainId, frameCtx?.selection.activeKeeperId, frameCtx?.selection.activeJourneyId])

  // ── Load domain data (journeys, keepers) ──
  React.useEffect(() => {
    if (!domainSlug) return
    let active = true

    async function loadDomainData() {
      try {
        const domain = (await apiFetch(`/api/domains/by-slug/${domainSlug}`)) as { id: string }
        if (!active) return
        setDomainId(domain.id)

        const [journeysRes, keepersRes] = await Promise.all([
          apiFetch(`/api/journeys?domainId=${domain.id}`).catch(() => null),
          apiFetch(`/api/keepers?domainId=${domain.id}`).catch(() => null),
        ])
        if (!active) return

        setJourneys(
          ((journeysRes as any)?.data?.journeys ?? (journeysRes as any)?.journeys ?? []) as JourneySummary[],
        )
        setKeepers(
          ((keepersRes as any)?.data?.keepers ?? (keepersRes as any)?.keepers ?? []) as KeeperSummary[],
        )
      } catch {
        if (active) {
          setJourneys([])
          setKeepers([])
        }
      }
    }

    loadDomainData()
    return () => { active = false }
  }, [domainSlug])

  // ── Load messages when session changes ──
  const fetchMessages = React.useCallback(
    async (sessionId: string, options: { silent?: boolean } = {}) => {
      if (!sessionId) { setMessages([]); return }
      if (!options.silent) setIsLoadingMessages(true)
      setMessagesError(null)
      try {
        const data = await KipApi.getSessionMessages(sessionId)
        setMessages(data.map(normalizeMessage))
      } catch (err) {
        setMessagesError(err instanceof Error ? err.message : "Unable to load messages")
      } finally {
        if (!options.silent) setIsLoadingMessages(false)
      }
    },
    [],
  )

  React.useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId)
    } else {
      setMessages([])
    }
  }, [activeSessionId, fetchMessages])

  // ── Auto-select first session ──
  React.useEffect(() => {
    if (sessions.length && view.kind === "dialogue" && !view.sessionId) {
      setView({ kind: "dialogue", sessionId: sessions[0].id })
    }
  }, [sessions, view, setView])

  // ── Load drafts ──
  const activeKeeperId = frameCtx?.selection.activeKeeperId ?? null
  const refreshDrafts = React.useCallback(async () => {
    if (!domainId) { setDrafts([]); return }
    setIsLoadingDrafts(true)
    setDraftsError(null)
    try {
      const list = await KipApi.listDrafts(domainId, activeKeeperId)
      setDrafts(list)
    } catch (err) {
      setDraftsError(err instanceof Error ? err.message : "Unable to load drafts")
    } finally {
      setIsLoadingDrafts(false)
    }
  }, [domainId, activeKeeperId])

  React.useEffect(() => {
    if (domainId) refreshDrafts()
  }, [domainId, refreshDrafts])

  // ── Load draft detail when viewing a draft ──
  const draftViewId = view.kind === "draft" ? view.draftId : null
  React.useEffect(() => {
    if (!draftViewId || !domainId) return
    setIsLoadingDrafts(true)
    KipApi.getDraft(domainId, draftViewId)
      .then((draft) => {
        setDraftDetail(draft)
      })
      .catch(() => {
        setDraftDetail(null)
        setDraftsError("Unable to load draft")
      })
      .finally(() => setIsLoadingDrafts(false))
  }, [draftViewId, domainId])

  // ── Load journey detail when viewing a journey ──
  const journeyViewId = view.kind === "journey" ? view.journeyId : null
  React.useEffect(() => {
    if (!journeyViewId) {
      setJourneyDetail(null)
      return
    }
    setIsLoadingJourneyDetail(true)
    setJourneyDetail(null)
    apiFetch(`/api/journeys/${journeyViewId}`)
      .then((res: any) => {
        const j = res?.journey ?? res?.data ?? res
        setJourneyDetail({
          id: j.id,
          name: j.name,
          forward: j.forward ?? "",
          createdAt: j.createdAt ?? "",
          updatedAt: j.updatedAt ?? "",
          keeper: j.keeper ?? null,
          moment: (j.moment ?? j.Moment ?? []).map((m: any) => ({
            id: m.id,
            title: m.title ?? "",
            narrative: m.narrative ?? "",
            keptAt: m.keptAt,
            createdAt: m.createdAt,
          })),
          paths: (j.paths ?? j.Path ?? []).map((p: any) => ({
            id: p.id ?? p,
            name: typeof p === "object" ? p.name ?? "" : String(p),
          })),
          stats: j.stats ?? { totalPaths: 0, totalMoments: 0 },
        })
      })
      .catch(() => setJourneyDetail(null))
      .finally(() => setIsLoadingJourneyDetail(false))
  }, [journeyViewId])

  // ── Load keeper detail when viewing a keeper ──
  const keeperViewId = view.kind === "keeper" ? view.keeperId : null
  React.useEffect(() => {
    if (!keeperViewId) {
      setKeeperDetail(null)
      return
    }
    setIsLoadingKeeperDetail(true)
    setKeeperDetail(null)
    apiFetch(`/api/keepers/${keeperViewId}`)
      .then((res: any) => {
        const k = res?.keeper ?? res?.data ?? res
        if (!k) return
        setKeeperDetail({
          id: k.id,
          title: k.title ?? k.name ?? "",
          purpose: k.purpose ?? null,
          domain: k.domain ?? null,
        })
      })
      .catch(() => setKeeperDetail(null))
      .finally(() => setIsLoadingKeeperDetail(false))
  }, [keeperViewId])

  // ── Handlers ──
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = inputValue.trim()
    if (!content || !agent || !activeSessionId) return

    const optimistic: AgentDialogueMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setInputValue("")
    setIsSending(true)
    setMessagesError(null)

    try {
      let result: Awaited<ReturnType<typeof KipApi.runAgent>>
      try {
        result = await KipApi.runAgent(agent.id, content, undefined, activeSessionId, {
          domainId: domainId || undefined,
          domainSlug: domainSlug || undefined,
          mode: "domain",
          activeJourneyId: frameCtx?.selection.activeJourneyId,
          activeKeeperId: frameCtx?.selection.activeKeeperId,
        })
      } catch (firstErr: unknown) {
        const status = (firstErr as { status?: number })?.status
        if (status === 401 && refreshSession) {
          const refreshed = await refreshSession()
          if (refreshed) {
            result = await KipApi.runAgent(agent.id, content, undefined, activeSessionId, {
              domainId: domainId || undefined,
              domainSlug: domainSlug || undefined,
              mode: "domain",
              activeJourneyId: frameCtx?.selection.activeJourneyId,
              activeKeeperId: frameCtx?.selection.activeKeeperId,
            })
          } else {
            setMessagesError("Session expired. Please log in again.")
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
            return
          }
        } else {
          throw firstErr
        }
      }

      const sessionIdFromResponse =
        (result as any)?.data?.data?.session_id || (result as any)?.session_id || null

      if (!activeSessionId && sessionIdFromResponse) {
        setView({ kind: "dialogue", sessionId: sessionIdFromResponse })
      } else {
        await fetchMessages(activeSessionId, { silent: true })

        // Update action pack, sole status, and system prompt from response
        const respData = (result as any)?.data
        if (respData?.actionPack) {
          const pack = respData.actionPack as ActionPack
          const flat = Object.entries(pack).flatMap(([entity, caps]) =>
            (Array.isArray(caps) ? caps : []).map((cap) => `${entity}.${cap}`)
          )
          setAllowedActions(flat)
        }
        if (respData?.soleStatus) setSoleStatus(respData.soleStatus)
        if (typeof respData?.composedSystemPrompt === "string") setComposedSystemPrompt(respData.composedSystemPrompt)

        // Handle action results (draft mutations, etc.)
        const actionResults = respData?.actions || (result as any)?.actionResults || undefined
        if (actionResults && Array.isArray(actionResults) && actionResults.length > 0) {
          setMessages((prev) => {
            const updated = [...prev]
            const lastAgentIdx = updated.findLastIndex((m) => m.role === "agent")
            if (lastAgentIdx >= 0) {
              updated[lastAgentIdx] = { ...updated[lastAgentIdx], actionResults }
            }
            return updated
          })

          const hasDraftMutation = actionResults.some((ar: any) => {
            const n = normalizeActionReceipt(ar)
            return n.status === "success" && ["draft.create", "draft.update", "draft.delete", "draft.setActive"].includes(n.type)
          })
          if (hasDraftMutation) {
            await refreshDrafts().catch(() => {})
          }
        }
      }
      refreshSessions()
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      const status = (err as { status?: number })?.status
      setMessagesError(
        status === 401 ? "Session expired. Please log in again." : "Failed to send. Please try again."
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleCreateSession = async () => {
    try {
      const session = await createSession(undefined, {
        domainId: domainId || undefined,
        domainSlug: domainSlug || undefined,
      })
      setView({ kind: "dialogue", sessionId: session.id })
      setMessages([])
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Unable to create session")
    }
  }

  const handleCreateDraft = async () => {
    if (!domainId) return
    setIsCreatingDraft(true)
    setDraftsError(null)
    try {
      const title = "Untitled Draft"
      const keeperId = frameCtx?.selection.activeKeeperId ?? undefined
      const draft = await KipApi.createDraft(domainId, {
        kind: "development_journey",
        key: makeDraftKey(title),
        title,
        summary: undefined,
        spec: {},
        keeperId,
      })
      await refreshDrafts()
      setView({ kind: "draft", draftId: draft.id })
    } catch (err) {
      setDraftsError(err instanceof Error ? err.message : "Unable to create draft")
    } finally {
      setIsCreatingDraft(false)
    }
  }

  const handleSaveDraftFromCard = async (payload: {
    title: string
    summary: string | null
    status: KipDraftStatus
    spec: DraftSpec
  }) => {
    if (!domainId || !draftDetail) return
    setIsSavingDraft(true)
    setDraftsError(null)
    try {
      const updated = await KipApi.updateDraft(domainId, draftDetail.id, {
        title: payload.title,
        summary: payload.summary ?? undefined,
        status: payload.status,
        spec: payload.spec,
      })
      setDraftDetail(updated)
      await refreshDrafts()
    } catch (err) {
      setDraftsError(err instanceof Error ? err.message : "Unable to save draft")
    } finally {
      setIsSavingDraft(false)
    }
  }

  // ── Posture data for banner ──
  const posture = useAgentPostureData({
    agentId: agent?.id ?? null,
    agentName: agent?.name ?? null,
    domainId,
    domainName: frameCtx?.domain?.name ?? null,
    domainSlug: domainSlug ?? null,
    isAuthenticated: isAuthenticated ?? false,
  })

  // ── Derived data for sidebar ──
  const agentName = agent?.name ?? "Agent"
  const hasKeeper = Boolean(frameCtx?.selection.activeKeeperId)
  const activeJourneyName = journeys.find((j) => j.id === frameCtx?.selection.activeJourneyId)?.name ?? null
  const activeKeeperName = keepers.find((k) => k.id === frameCtx?.selection.activeKeeperId)?.title ?? null

  const sessionItems: SidebarCardItem[] = sessions.slice(0, 5).map((s) => ({
    label: s.title || `Session ${shortId(s.id)}`,
    id: s.id,
    onClick: () => setView({ kind: "dialogue", sessionId: s.id }),
  }))

  const draftItems: SidebarCardItem[] = drafts.slice(0, 5).map((d) => {
    const keeperName = d.keeperId ? keepers.find((k) => k.id === d.keeperId)?.title : null
    const label = keeperName ? `${d.title} · ${keeperName}` : d.title
    return {
      label,
      id: d.id,
      onClick: () => setView({ kind: "draft", draftId: d.id }),
    }
  })

  const journeyItems: SidebarCardItem[] = journeys.slice(0, 4).map((j) => ({
    label: `${j.name}${j.momentCount != null ? ` · ${j.momentCount} moments` : ""}`,
    id: j.id,
    onClick: () => {
      frameCtx?.setActiveJourneyId(j.id)
      setView({ kind: "journey", journeyId: j.id })
    },
  }))

  const keeperItems: SidebarCardItem[] = keepers.slice(0, 4).map((k) => ({
    label: k.title,
    id: k.id,
    onClick: () => {
      frameCtx?.setActiveKeeperId(k.id)
      setView({ kind: "keeper", keeperId: k.id })
    },
  }))

  const promptedActions = React.useMemo<PromptedAction[]>(() => {
    const actions: PromptedAction[] = []
    if (drafts.length > 0) {
      actions.push({
        label: `${drafts.length} draft${drafts.length > 1 ? "s" : ""} in progress`,
        actionLabel: "View drafts",
        onAction: () => setView({ kind: "draft", draftId: drafts[0].id }),
      })
    }
    if (!activeSessionId && sessions.length === 0) {
      actions.push({
        label: "No active session",
        detail: "Start a conversation to begin",
        actionLabel: "New session",
        onAction: handleCreateSession,
      })
    }
    actions.push({
      label: "Agent diagnostics",
      detail: "View configuration and capabilities",
      actionLabel: "Open cockpit",
      onAction: () => setView({ kind: "cockpit" }),
    })
    return actions
  }, [drafts, activeSessionId, sessions, setView])

  // ── Workspace renderers ──

  const renderDialogueWorkspace = () => (
    <div className="space-y-4">
      <WorkspaceHeader
        eyebrow="Session"
        title={`Conversation with ${agentName}`}
        description={activeSessionId ? `Session ${shortId(activeSessionId)}` : "No active session"}
      />
      <AgentContextBar
        activeJourneyName={activeJourneyName}
        activeKeeperName={activeKeeperName}
        soleActive={soleStatus?.soleActive ?? (domainId ? true : hasKeeper)}
        sessionId={activeSessionId}
      />
      <DialogueMessageList
        isLoading={isLoadingMessages || isAgentLoading}
        messages={messages}
        isSending={isSending}
        error={messagesError}
        agentName={agentName}
        onOpenDraft={(draftId) => setView({ kind: "draft", draftId })}
        onConfirmDraftUpdate={
          domainId
            ? (draftId, payload) => {
                KipApi.updateDraft(domainId, draftId, {
                  ...payload,
                  status: payload.status as KipDraftStatus | undefined,
                }).then(() => refreshDrafts())
              }
            : undefined
        }
      />
      <form onSubmit={handleSendMessage} className="flex gap-2 pt-2">
        <div className="flex flex-1 items-end gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--theme-border-soft)", backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)" }}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                const form = (e.target as HTMLTextAreaElement).form
                if (form && inputValue.trim() && activeSessionId && !isSending) {
                  form.requestSubmit()
                }
              }
            }}
            placeholder={
              activeSessionId
                ? "Share your thoughts... (Shift+Enter for new line)"
                : "Create a session to start chatting"
            }
            disabled={!activeSessionId || isSending}
            rows={1}
            className="min-h-[44px] max-h-32 flex-1 resize-y bg-transparent px-1 py-2 text-sm focus:outline-none focus:ring-0"
            style={{ color: "var(--theme-ink-primary)" }}
          />
          <input
            type="file"
            id="chat-file-upload"
            className="hidden"
            accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const text = reader.result as string
                if (text) setInputValue((prev) => (prev ? `${prev}\n\n${text}` : text))
              }
              reader.readAsText(file)
              e.target.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => document.getElementById("chat-file-upload")?.click()}
            disabled={!activeSessionId || isSending}
            className="flex cursor-pointer items-center justify-center rounded-lg p-2 transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:opacity-50"
            style={{ color: "var(--theme-ink-secondary)" }}
            title="Attach file (text files)"
            aria-label="Attach file"
          >
            <PaperClipIcon className="h-5 w-5" />
          </button>
        </div>
        <button
          type="submit"
          disabled={!inputValue.trim() || !activeSessionId || isSending}
          className="inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-3 text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-ink-primary)" }}
        >
          {isSending ? (
            <span className="text-sm font-semibold">Sending…</span>
          ) : (
            <PaperAirplaneIcon className="h-5 w-5" />
          )}
        </button>
      </form>
      {messagesError && (
        <button
          type="button"
          onClick={() => setMessagesError(null)}
          className="text-xs underline"
          style={{ color: "var(--theme-ink-secondary)" }}
        >
          Dismiss error
        </button>
      )}
    </div>
  )

  const renderDraftWorkspace = () => {
    if (!draftDetail && !isLoadingDrafts) {
      return (
        <div className="space-y-4">
          <WorkspaceHeader
            eyebrow="Draft"
            title="Draft not found"
            description="This draft may have been removed."
          />
          <button
            type="button"
            onClick={() => setView({ kind: "dialogue" })}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
            style={{
              borderColor: "var(--theme-border-soft)",
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
              color: "var(--theme-ink-primary)",
            }}
          >
            Back to dialogue
          </button>
        </div>
      )
    }

    if (isLoadingDrafts || !draftDetail) {
      return (
        <p className="text-sm" style={{ color: "var(--theme-ink-secondary)" }}>
          Loading draft…
        </p>
      )
    }

    return (
      <DraftCard
        draft={draftDetail}
        isSaving={isSavingDraft}
        error={draftsError}
        onSave={handleSaveDraftFromCard}
        onBackToDialogue={() => setView({ kind: "dialogue" })}
      />
    )
  }

  const renderListWorkspace = (type: "drafts" | "journeys" | "keepers" | "sessions") => {
    const titles = { drafts: "Drafts", journeys: "Journeys", keepers: "Keepers", sessions: "Sessions" }
    const items =
      type === "drafts"
        ? drafts
        : type === "journeys"
          ? journeys
          : type === "keepers"
            ? keepers
            : sessions
    const isLoading =
      type === "drafts"
        ? isLoadingDrafts
        : type === "sessions"
          ? isSessionsLoading
          : false

    return (
      <div className="space-y-6">
        <WorkspaceHeader
          eyebrow={titles[type]}
          title={`All ${titles[type]}`}
          description={
            isLoading
              ? "Loading…"
              : `${Array.isArray(items) ? items.length : 0} ${titles[type].toLowerCase()}`
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {type === "drafts" &&
            (items as KipDraftSummary[]).map((d) => {
              const keeperName = d.keeperId ? keepers.find((k) => k.id === d.keeperId)?.title : null
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setView({ kind: "draft", draftId: d.id })}
                  className="rounded-2xl border p-4 text-left transition-all hover:shadow-md"
                  style={{
                    borderColor: "var(--theme-border-soft)",
                    backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                  }}
                >
                  <h4 className="font-semibold" style={{ color: "var(--theme-ink-primary)" }}>
                    {d.title}
                  </h4>
                  {keeperName && (
                    <p className="mt-1 text-sm" style={{ color: "var(--theme-ink-secondary)" }}>
                      {keeperName}
                    </p>
                  )}
                  <span
                    className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs capitalize"
                    style={{
                      backgroundColor: "hsl(var(--theme-surface-paper) / 0.8)",
                      color: "var(--theme-ink-secondary)",
                    }}
                  >
                    {d.status}
                  </span>
                </button>
              )
            })}
          {type === "journeys" &&
            (items as JourneySummary[]).map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => {
                  frameCtx?.setActiveJourneyId(j.id)
                  setView({ kind: "journey", journeyId: j.id })
                }}
                className="rounded-2xl border p-4 text-left transition-all hover:shadow-md"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                }}
              >
                <h4 className="font-semibold" style={{ color: "var(--theme-ink-primary)" }}>
                  {j.name}
                </h4>
                {j.forward && (
                  <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--theme-ink-secondary)" }}>
                    {j.forward}
                  </p>
                )}
                <p className="mt-2 text-xs" style={{ color: "var(--theme-ink-secondary)" }}>
                  {j.momentCount ?? 0} moments
                </p>
              </button>
            ))}
          {type === "keepers" &&
            (items as KeeperSummary[]).map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => {
                  frameCtx?.setActiveKeeperId(k.id)
                  setView({ kind: "keeper", keeperId: k.id })
                }}
                className="rounded-2xl border p-4 text-left transition-all hover:shadow-md"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                }}
              >
                <h4 className="font-semibold" style={{ color: "var(--theme-ink-primary)" }}>
                  {k.title}
                </h4>
                {k.purpose && (
                  <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--theme-ink-secondary)" }}>
                    {k.purpose}
                  </p>
                )}
              </button>
            ))}
          {type === "sessions" &&
            (items as { id: string; title?: string | null }[]).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setView({ kind: "dialogue", sessionId: s.id })}
                className="rounded-2xl border p-4 text-left transition-all hover:shadow-md"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                }}
              >
                <h4 className="font-semibold" style={{ color: "var(--theme-ink-primary)" }}>
                  {s.title || `Session ${shortId(s.id)}`}
                </h4>
              </button>
            ))}
        </div>
        {Array.isArray(items) && items.length === 0 && !isLoading && (
          <p className="text-sm" style={{ color: "var(--theme-ink-secondary)" }}>
            No {titles[type].toLowerCase()} yet.
          </p>
        )}
        <button
          type="button"
          onClick={() => setView({ kind: "dialogue" })}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
          style={{
            borderColor: "var(--theme-border-soft)",
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
            color: "var(--theme-ink-primary)",
          }}
        >
          ← Dialogue
        </button>
      </div>
    )
  }

  const renderJourneyDetailWorkspace = () => {
    if (!journeyViewId) return null
    if (isLoadingJourneyDetail) {
      return (
        <p className="text-sm" style={{ color: "var(--theme-ink-secondary)" }}>
          Loading journey…
        </p>
      )
    }
    if (!journeyDetail) {
      return (
        <div className="space-y-4">
          <WorkspaceHeader
            eyebrow="Journey"
            title="Journey not found"
            description="This journey may have been removed."
          />
          <button
            type="button"
            onClick={() => setView({ kind: "dialogue" })}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium"
            style={{
              borderColor: "var(--theme-border-soft)",
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
              color: "var(--theme-ink-primary)",
            }}
          >
            Back to dialogue
          </button>
        </div>
      )
    }
    return (
      <JourneyCard
        journey={journeyDetail}
        isActive={frameCtx?.selection.activeJourneyId === journeyDetail.id}
        onSetActive={() => frameCtx?.setActiveJourneyId(journeyDetail.id)}
        onBackToDialogue={() => setView({ kind: "dialogue" })}
        onOpenMoment={(momentId) => navigateToFrame("moment", { draftId: momentId })}
      />
    )
  }

  const renderKeeperDetailWorkspace = () => {
    if (!keeperViewId) return null
    if (isLoadingKeeperDetail) {
      return (
        <p className="text-sm" style={{ color: "var(--theme-ink-secondary)" }}>
          Loading keeper…
        </p>
      )
    }
    if (!keeperDetail) {
      return (
        <div className="space-y-4">
          <WorkspaceHeader
            eyebrow="Keeper"
            title="Keeper not found"
            description="This keeper may have been removed."
          />
          <button
            type="button"
            onClick={() => setView({ kind: "dialogue" })}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium"
            style={{
              borderColor: "var(--theme-border-soft)",
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
              color: "var(--theme-ink-primary)",
            }}
          >
            Back to dialogue
          </button>
        </div>
      )
    }
    return (
      <KeeperCard
        keeper={keeperDetail}
        isActive={frameCtx?.selection.activeKeeperId === keeperDetail.id}
        onSetActive={() => frameCtx?.setActiveKeeperId(keeperDetail.id)}
        onBackToDialogue={() => setView({ kind: "dialogue" })}
      />
    )
  }

  const renderCockpitWorkspace = () => (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Cockpit"
        title={`${agentName} configuration`}
        description="Agent capabilities, model settings, and diagnostics."
      />
      <CockpitPanel
        agent={agent}
        sessions={sessions}
        activeSessionId={activeSessionId}
        allowedActions={allowedActions}
        composedSystemPrompt={composedSystemPrompt}
        activeKeeperId={frameCtx?.selection.activeKeeperId}
        domainId={domainId}
        soleStatus={soleStatus}
        showCompliance={isAdmin}
      />
      <button
        type="button"
        onClick={() => setView({ kind: "dialogue" })}
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
        style={{
          borderColor: "var(--theme-border-soft)",
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
          color: "var(--theme-ink-primary)",
        }}
      >
        Back to dialogue
      </button>
    </div>
  )

  const renderWorkspace = () => {
    switch (view.kind) {
      case "draft":
        return renderDraftWorkspace()
      case "cockpit":
        return renderCockpitWorkspace()
      case "list":
        return renderListWorkspace(view.type)
      case "journey":
        return renderJourneyDetailWorkspace()
      case "keeper":
        return renderKeeperDetailWorkspace()
      case "dialogue":
      default:
        return renderDialogueWorkspace()
    }
  }

  // ── Error state ──
  if (agentError && !isAgentLoading) {
    return (
      <DesignFrame styleId={styleId} themeSlug={themeSlug} title="Agent Board" subtitle="Unable to load agent">
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--theme-border-soft)" }}>
          <p className="text-sm" style={{ color: "var(--theme-ink-secondary)" }}>{agentError}</p>
          <button
            type="button"
            onClick={() => navigateToFrame("commons")}
            className="mt-4 text-xs underline"
            style={{ color: "var(--theme-ink-secondary)" }}
          >
            Back to Commons
          </button>
        </div>
      </DesignFrame>
    )
  }

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title={
        isAgentLoading
          ? "Agent Board"
          : `${posture.domainName || "Domain"} · Agent studio`
      }
      subtitle={
        isAgentLoading ? undefined : `with ${agentName}`
      }
      themeSwitcherSlot={<ThemeSwitcher />}
      headerFooterSlot={
        !posture.isLoading && !posture.error ? (
          <AgentContextBanner
            domainName={posture.domainName}
            keeperName={activeKeeperName}
            journeyName={activeJourneyName}
            agentName={posture.agentName}
            isLive={posture.isLive}
            onOpenCockpit={() => setView({ kind: "cockpit" })}
          />
        ) : null
      }
      rightSlot={
        <button
          type="button"
          onClick={() => navigateToFrame("commons")}
          className="text-xs font-medium underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--theme-ink-secondary)" }}
        >
          Back to Commons
        </button>
      }
    >
      <SidebarWorkspaceLayout
        sidebarLabel="Agent context"
        workspaceLabel="Agent workspace"
        sidebar={
          <>
            <SidebarCard
              title="Drafts"
              description={isLoadingDrafts ? "Loading drafts…" : `${drafts.length} draft${drafts.length !== 1 ? "s" : ""}`}
              items={draftItems.length ? draftItems : [{ label: "No drafts yet" }]}
              onAdd={handleCreateDraft}
              onTitleClick={() => setView({ kind: "list", type: "drafts" })}
            />

            <SidebarCard
              title="Journeys"
              description="Scope the conversation to a journey"
              items={journeyItems.length ? journeyItems : [{ label: "No journeys available" }]}
              onTitleClick={() => setView({ kind: "list", type: "journeys" })}
            />

            <SidebarCard
              title="Keepers"
              description="Scope the conversation to a keeper"
              items={keeperItems.length ? keeperItems : [{ label: "No keepers available" }]}
              onTitleClick={() => setView({ kind: "list", type: "keepers" })}
            />

            <SidebarCard
              title="Sessions"
              description={isSessionsLoading ? "Loading sessions…" : `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}
              items={sessionItems.length ? sessionItems : [{ label: "No sessions yet" }]}
              onAdd={handleCreateSession}
              onTitleClick={() => setView({ kind: "list", type: "sessions" })}
            />

            <PromptedActionCard items={promptedActions} />
          </>
        }
      >
        {renderWorkspace()}
      </SidebarWorkspaceLayout>
    </DesignFrame>
  )
}

export default AgentBoardFrame
