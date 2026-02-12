"use client"

/**
 * AgentBoardFrame
 *
 * The new composable Agent Board frame, built on the same primitives as the
 * refactored Commons Frame (SidebarWorkspaceLayout, SidebarCard, WorkspaceHeader,
 * useAgentWorkspaceView).
 *
 * Sidebar: Dialogues (sessions), Drafts, Recent Journeys, Recent Keepers,
 * Prompted Actions.
 *
 * Workspace views:
 *   - dialogue: Live conversation with the domain agent
 *   - draft:    Draft editor/viewer
 *   - cockpit:  Agent configuration and diagnostics
 *
 * The agent name is dynamic — loaded from the API, never hardcoded.
 */

import * as React from "react"
import { PaperAirplaneIcon } from "@heroicons/react/24/outline"
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
import type { AgentDialogueMessage } from "../../../components/agent/types"
import { normalizeActionReceipt } from "../../../components/agent/types"
import { shortId } from "../../../components/agent/helpers"

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
  return {
    id: message.id,
    role,
    content: message.content,
    createdAt: new Date(message.created_at || Date.now()).toISOString(),
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
  const { isAuthenticated } = useAuth()
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

  // ── Draft state ──
  const [drafts, setDrafts] = React.useState<KipDraftSummary[]>([])
  const [draftDetail, setDraftDetail] = React.useState<KipDraft | null>(null)
  const [draftSpecText, setDraftSpecText] = React.useState("")
  const [draftJsonError, setDraftJsonError] = React.useState<string | null>(null)
  const [isLoadingDrafts, setIsLoadingDrafts] = React.useState(false)
  const [isSavingDraft, setIsSavingDraft] = React.useState(false)
  const [isCreatingDraft, setIsCreatingDraft] = React.useState(false)
  const [draftsError, setDraftsError] = React.useState<string | null>(null)

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

  // ── Load action pack (tools the agent can use) ──
  React.useEffect(() => {
    if (!agent?.id || !domainId) return
    let active = true
    KipApi.getActionPack(agent.id, domainId)
      .then(({ allowedActions: actions }) => {
        if (!active) return
        setAllowedActions(actions)
      })
      .catch(() => { /* ignore */ })
    return () => { active = false }
  }, [agent?.id, domainId])

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
  const refreshDrafts = React.useCallback(async () => {
    if (!domainId) { setDrafts([]); return }
    setIsLoadingDrafts(true)
    setDraftsError(null)
    try {
      const list = await KipApi.listDrafts(domainId)
      setDrafts(list)
    } catch (err) {
      setDraftsError(err instanceof Error ? err.message : "Unable to load drafts")
    } finally {
      setIsLoadingDrafts(false)
    }
  }, [domainId])

  React.useEffect(() => {
    if (domainId) refreshDrafts()
  }, [domainId, refreshDrafts])

  // ── Load draft detail when viewing a draft ──
  const draftViewId = view.kind === "draft" ? view.draftId : null
  React.useEffect(() => {
    if (!draftViewId || !domainId) return
    setIsLoadingDrafts(true)
    setDraftJsonError(null)
    KipApi.getDraft(domainId, draftViewId)
      .then((draft) => {
        setDraftDetail(draft)
        setDraftSpecText(JSON.stringify(draft.spec ?? {}, null, 2))
      })
      .catch(() => {
        setDraftDetail(null)
        setDraftSpecText("")
        setDraftsError("Unable to load draft")
      })
      .finally(() => setIsLoadingDrafts(false))
  }, [draftViewId, domainId])

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
      const result = await KipApi.runAgent(agent.id, content, undefined, activeSessionId, {
        domainId: domainId || undefined,
        domainSlug: domainSlug || undefined,
        mode: "domain",
        activeJourneyId: frameCtx?.selection.activeJourneyId,
        activeKeeperId: frameCtx?.selection.activeKeeperId,
      })

      const sessionIdFromResponse =
        (result as any)?.data?.data?.session_id || (result as any)?.session_id || null

      if (!activeSessionId && sessionIdFromResponse) {
        setView({ kind: "dialogue", sessionId: sessionIdFromResponse })
      } else {
        await fetchMessages(activeSessionId, { silent: true })

        // Update action pack from response if present
        const respData = (result as any)?.data
        if (respData?.actionPack) {
          const pack = respData.actionPack as ActionPack
          const flat = Object.entries(pack).flatMap(([entity, caps]) =>
            (Array.isArray(caps) ? caps : []).map((cap) => `${entity}.${cap}`)
          )
          setAllowedActions(flat)
        }

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
      setMessagesError(err instanceof Error ? err.message : "Unable to send message")
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
      const draft = await KipApi.createDraft(domainId, {
        kind: "development_journey",
        key: makeDraftKey(title),
        title,
        summary: null,
        spec: {},
      })
      await refreshDrafts()
      setView({ kind: "draft", draftId: draft.id })
    } catch (err) {
      setDraftsError(err instanceof Error ? err.message : "Unable to create draft")
    } finally {
      setIsCreatingDraft(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!domainId || !draftDetail) return
    let parsedSpec: unknown = {}
    try {
      parsedSpec = draftSpecText.trim() ? JSON.parse(draftSpecText) : {}
      setDraftJsonError(null)
    } catch {
      setDraftJsonError("Spec JSON is invalid. Please fix and try again.")
      return
    }

    setIsSavingDraft(true)
    setDraftsError(null)
    try {
      const updated = await KipApi.updateDraft(domainId, draftDetail.id, {
        title: draftDetail.title,
        summary: draftDetail.summary ?? undefined,
        status: (draftDetail.status as KipDraftStatus) || "draft",
        spec: parsedSpec,
      })
      setDraftDetail(updated)
      setDraftSpecText(JSON.stringify(updated.spec ?? {}, null, 2))
      await refreshDrafts()
    } catch (err) {
      setDraftsError(err instanceof Error ? err.message : "Unable to save draft")
    } finally {
      setIsSavingDraft(false)
    }
  }

  // ── Derived data for sidebar ──
  const agentName = agent?.name ?? "Agent"
  const hasKeeper = Boolean(frameCtx?.selection.activeKeeperId)
  const activeJourneyName = journeys.find((j) => j.id === frameCtx?.selection.activeJourneyId)?.name ?? null
  const activeKeeperName = keepers.find((k) => k.id === frameCtx?.selection.activeKeeperId)?.title ?? null

  const dialogueItems: SidebarCardItem[] = sessions.slice(0, 5).map((s) => ({
    label: s.title || `Session ${shortId(s.id)}`,
    id: s.id,
    onClick: () => setView({ kind: "dialogue", sessionId: s.id }),
  }))

  const draftItems: SidebarCardItem[] = drafts.slice(0, 5).map((d) => ({
    label: d.title,
    id: d.id,
    onClick: () => setView({ kind: "draft", draftId: d.id }),
  }))

  const journeyItems: SidebarCardItem[] = journeys.slice(0, 4).map((j) => ({
    label: `${j.name}${j.momentCount != null ? ` · ${j.momentCount} moments` : ""}`,
    id: j.id,
    onClick: () => {
      frameCtx?.setActiveJourneyId(j.id)
    },
  }))

  const keeperItems: SidebarCardItem[] = keepers.slice(0, 4).map((k) => ({
    label: k.title,
    id: k.id,
    onClick: () => {
      frameCtx?.setActiveKeeperId(k.id)
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
        label: "No active dialogue",
        detail: "Start a conversation to begin",
        actionLabel: "New dialogue",
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
        eyebrow="Dialogue"
        title={`Conversation with ${agentName}`}
        description={activeSessionId ? `Session ${shortId(activeSessionId)}` : "No active session"}
      />
      <AgentContextBar
        activeJourneyName={activeJourneyName}
        activeKeeperName={activeKeeperName}
        soleActive={hasKeeper}
        sessionId={activeSessionId}
      />
      <DialogueMessageList
        isLoading={isLoadingMessages || isAgentLoading}
        messages={messages}
        isSending={isSending}
        error={messagesError}
        agentName={agentName}
        onOpenDraft={(draftId) => setView({ kind: "draft", draftId })}
      />
      <form onSubmit={handleSendMessage} className="flex gap-3 pt-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            activeSessionId
              ? "Share your thoughts..."
              : "Create a dialogue to start chatting"
          }
          disabled={!activeSessionId || isSending}
          className="flex-1 rounded-xl border px-4 py-3 text-sm transition-colors focus:ring-2 focus:ring-offset-1"
          style={{
            borderColor: "var(--theme-border-soft)",
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
            color: "var(--theme-ink-primary)",
          }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || !activeSessionId || isSending}
          className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-white transition-colors disabled:opacity-50"
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

    return (
      <div className="space-y-4">
        <WorkspaceHeader
          eyebrow="Draft"
          title={draftDetail?.title || "Loading draft…"}
          description="Edit title, summary, status, and JSON spec"
        />
        {isLoadingDrafts ? (
          <p className="text-sm" style={{ color: "var(--theme-ink-secondary)" }}>
            Loading draft…
          </p>
        ) : draftDetail ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--theme-ink-secondary)" }}>
                  Title
                </span>
                <input
                  type="text"
                  value={draftDetail.title}
                  onChange={(e) => setDraftDetail({ ...draftDetail, title: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--theme-border-soft)", color: "var(--theme-ink-primary)" }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--theme-ink-secondary)" }}>
                  Status
                </span>
                <select
                  value={draftDetail.status || "draft"}
                  onChange={(e) => setDraftDetail({ ...draftDetail, status: e.target.value as KipDraftStatus })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--theme-border-soft)", color: "var(--theme-ink-primary)" }}
                >
                  {(["draft", "reviewed", "approved", "promoted", "archived"] as KipDraftStatus[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--theme-ink-secondary)" }}>
                Summary
              </span>
              <textarea
                value={draftDetail.summary ?? ""}
                onChange={(e) => setDraftDetail({ ...draftDetail, summary: e.target.value })}
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--theme-border-soft)", color: "var(--theme-ink-primary)" }}
              />
            </label>
            <label className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--theme-ink-secondary)" }}>
                  Spec JSON
                </span>
                <span className="text-[11px]" style={{ color: "var(--theme-ink-secondary)" }}>Direct edits allowed</span>
              </div>
              <textarea
                value={draftSpecText}
                onChange={(e) => { setDraftSpecText(e.target.value); setDraftJsonError(null) }}
                rows={14}
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
                style={{ borderColor: "var(--theme-border-soft)", color: "var(--theme-ink-primary)" }}
              />
            </label>
            {draftJsonError && <p className="text-sm text-red-600">{draftJsonError}</p>}
            {draftsError && <p className="text-sm text-red-600">{draftsError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                  color: "var(--theme-ink-primary)",
                }}
              >
                {isSavingDraft ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                onClick={() => setView({ kind: "dialogue" })}
                className="text-xs underline underline-offset-2"
                style={{ color: "var(--theme-ink-secondary)" }}
              >
                Back to dialogue
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const renderCockpitWorkspace = () => (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Cockpit"
        title={`${agentName} configuration`}
        description="Agent capabilities, model settings, and diagnostics."
      />
      <CockpitPanel agent={agent} sessions={sessions} activeSessionId={activeSessionId} allowedActions={allowedActions} />
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
      title={isAgentLoading ? "Agent Board" : `${agentName} · Agent Board`}
      subtitle="Domain agent workspace"
      themeSwitcherSlot={<ThemeSwitcher />}
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
              title="Dialogues"
              description={isSessionsLoading ? "Loading sessions…" : `${sessions.length} conversation${sessions.length !== 1 ? "s" : ""}`}
              items={dialogueItems.length ? dialogueItems : [{ label: "No dialogues yet" }]}
              onAdd={handleCreateSession}
            />

            <SidebarCard
              title="Drafts"
              description={isLoadingDrafts ? "Loading drafts…" : `${drafts.length} draft${drafts.length !== 1 ? "s" : ""}`}
              items={draftItems.length ? draftItems : [{ label: "No drafts yet" }]}
              onAdd={handleCreateDraft}
            />

            <SidebarCard
              title="Journeys"
              description="Scope the conversation to a journey"
              items={journeyItems.length ? journeyItems : [{ label: "No journeys available" }]}
            />

            <SidebarCard
              title="Keepers"
              description="Scope the conversation to a keeper"
              items={keeperItems.length ? keeperItems : [{ label: "No keepers available" }]}
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
