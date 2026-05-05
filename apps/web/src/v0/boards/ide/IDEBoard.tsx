"use client"

/**
 * IDEBoard — Moment 2.5
 *
 * Migrated to UniversalBoard shell.
 *
 * Shell removed: StyleScope, KeeperTopBar, DomainBriefSlideOver, pageBackground,
 * KeeperBoardPanelGroup, domainId resolution for panel layout.
 * UniversalBoard owns all of that now.
 *
 * What stays — board-specific logic that is NOT shell:
 *   - domainId resolution for journeys/keepers fetch (board data, not panel wiring)
 *   - journeys + keepers state (banner name derivation + KeeperViewPanel)
 *   - Session management: navSessions, kipAgentId, sessionListVersion
 *   - Selection state with mutual exclusion (activeJourneyId, selectedDraftId,
 *     selectedMomentId, selectedKeeperId, activeSessionId)
 *   - activeService — ServicesFrame overlay in the right panel
 *   - All creation/sync callbacks from IDEBoardNav and IDEBoardConversation
 *
 * Left panel:  IDEBoardNav — has session management not in UniversalNavPanel
 * Center panel: IDEBoardConversation — untouched
 * Right panel:  5-state custom panel (service → journey/draft/moment → keeper explicit
 *               → keeper from frame context → home) — all with frosted glass wrapper
 */

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"

import { UniversalBoard } from "../UniversalBoard"
import { IDE_BOARD_DEF } from "../UniversalBoardDefinition"
import { IDEBoardNav } from "./IDEBoardNav"
import { IDEBoardConversation } from "./IDEBoardConversation"
import { IDEBoardContext } from "./IDEBoardContext"
import type { IDEBoardKipContext } from "./ideBoardTypes"
import { ServicesFrame } from "./components/ServicesFrame"
import { KeeperViewPanel } from "../../components/panels/KeeperViewPanel"
import { HomeViewPanel } from "../../components/panels/HomeViewPanel"

// ─── Types ────────────────────────────────────────────────────────────────────

type JourneySummary = { id: string; name: string; momentCount?: number; keeperId?: string | null }
type KeeperSummary = { id: string; title: string }
type NavSession = { id: string; title: string; updatedAt: string }

// Shared frosted glass style for all right panel branches
const FROSTED_GLASS: React.CSSProperties = {
  background: "hsl(var(--theme-surface-panel) / 0.85)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "8px",
  border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IDEBoard() {
  const { domainSlug, domainFrame } = useV0Shell()
  const frameCtx = useFrameContextOptional()
  const slug = domainSlug ?? ""

  // ── Board-specific state ───────────────────────────────────────────────────

  // domainId: resolved for journeys/keepers fetch and conversation wiring.
  // UniversalBoard resolves domainId independently for panel layout.
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [journeys, setJourneys] = React.useState<JourneySummary[]>([])
  const [keepers, setKeepers] = React.useState<KeeperSummary[]>([])
  const [activeJourneyId, setActiveJourneyId] = React.useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(null)
  const [selectedMomentId, setSelectedMomentId] = React.useState<string | null>(null)
  const [selectedKeeperId, setSelectedKeeperId] = React.useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const [draftListVersion, setDraftListVersion] = React.useState(0)
  const [sessionListVersion, setSessionListVersion] = React.useState(0)
  const [activeService, setActiveService] = React.useState<"cloud" | "railway" | "vercel" | "github" | null>(null)
  const [navSessions, setNavSessions] = React.useState<NavSession[]>([])
  const [kipAgentId, setKipAgentId] = React.useState<string | null>(null)

  // domainId resolution — for journeys/keepers and conversation.
  React.useEffect(() => {
    if (!slug) return
    let cancelled = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(slug)}`)
      .then((res: { id?: string }) => {
        if (!cancelled && res?.id) setDomainId(res.id)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [slug])

  // Journeys + keepers — for banner name derivation and right panel KeeperViewPanel.
  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    Promise.all([
      apiFetch(`/api/journeys?domainId=${domainId}`).catch(() => null),
      apiFetch(`/api/keepers?domainId=${domainId}`).catch(() => null),
    ]).then(([journeysRes, keepersRes]) => {
      if (cancelled) return
      setJourneys(
        ((journeysRes as any)?.data?.journeys ?? (journeysRes as any)?.journeys ?? []) as JourneySummary[],
      )
      setKeepers(
        ((keepersRes as any)?.data?.keepers ?? (keepersRes as any)?.keepers ?? []) as KeeperSummary[],
      )
    }).catch(() => {})
    return () => { cancelled = true }
  }, [domainId])

  // ── Derived names (banner context) ────────────────────────────────────────

  const keeperName = keepers.find((k) => k.id === (frameCtx?.selection.activeKeeperId ?? null))?.title ?? null
  const journeyName = journeys.find((j) => j.id === (frameCtx?.selection.activeJourneyId ?? activeJourneyId))?.name ?? null
  const activeSessionTitle = navSessions.find((s) => s.id === activeSessionId)?.title ?? null

  // ── Selection callbacks — mutual exclusion maintained as before ───────────

  const onJourneySelect = React.useCallback((id: string) => {
    setActiveJourneyId(id)
    setSelectedDraftId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
  }, [])

  const onJourneyBack = React.useCallback(() => {
    setActiveJourneyId(null)
    setSelectedDraftId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
  }, [])

  const onDraftSelect = React.useCallback((id: string) => {
    setSelectedDraftId(id)
    setActiveJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
  }, [])

  const onMomentSelect = React.useCallback((id: string) => {
    setSelectedMomentId(id)
    setSelectedDraftId(null)
    setActiveJourneyId(null)
    setSelectedKeeperId(null)
  }, [])

  const onKeeperSelect = React.useCallback((id: string) => {
    setSelectedKeeperId(id)
    setSelectedDraftId(null)
    setSelectedMomentId(null)
  }, [])

  const onSessionSelect = React.useCallback((id: string) => {
    setActiveSessionId(id)
    setSelectedMomentId(null)
  }, [])

  const onSessionsLoaded = React.useCallback(
    (sessions: { id: string; title: string; updatedAt: string }[]) => {
      setNavSessions(sessions)
    },
    [],
  )

  const onJourneyCreated = React.useCallback(
    (journey: { id: string; name: string }) => {
      setJourneys((prev) => [{ id: journey.id, name: journey.name }, ...prev])
    },
    [],
  )

  const onKeeperCreated = React.useCallback(
    (keeper: { id: string; title: string }) => {
      setKeepers((prev) => [{ id: keeper.id, title: keeper.title }, ...prev])
    },
    [],
  )

  const onSaveSessionTitle = React.useCallback((id: string, title: string) => {
    setNavSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
    setSessionListVersion((v) => v + 1)
  }, [])

  const onAgentIdResolved = React.useCallback((agentId: string) => {
    setKipAgentId(agentId)
  }, [])

  const onNewSession = React.useCallback(async () => {
    if (!kipAgentId) return
    try {
      const now = new Date().toISOString()
      const session = await KipApi.createSession(kipAgentId, undefined, "New Session")
      const newItem: NavSession = {
        id: session.id,
        title: session.session_name?.trim() || "New Session",
        updatedAt: session.updated_at ? new Date(session.updated_at).toISOString() : now,
      }
      setNavSessions((prev) => [newItem, ...prev])
      setActiveSessionId(session.id)
    } catch {
      // silent
    }
  }, [kipAgentId])

  const onKipContextSync = React.useCallback((ctx: IDEBoardKipContext) => {
    if (ctx.type === "draft") {
      setSelectedDraftId(ctx.id)
      setActiveJourneyId(null)
      setSelectedMomentId(null)
      setSelectedKeeperId(null)
      setDraftListVersion((v) => v + 1)
      return
    }
    if (ctx.type === "journey") {
      setActiveJourneyId(ctx.id)
      setSelectedDraftId(null)
      setSelectedMomentId(null)
      setSelectedKeeperId(null)
      return
    }
    if (ctx.type === "moment") {
      setSelectedMomentId(ctx.id)
      setSelectedDraftId(null)
      setActiveJourneyId(null)
      setSelectedKeeperId(null)
    }
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <UniversalBoard
      def={IDE_BOARD_DEF}

      // Left — IDEBoardNav: sessions, optimistic creation, agent ID resolution
      left={(leftProps) => (
        <div
          className="flex h-full min-h-0 flex-col overflow-hidden"
          style={FROSTED_GLASS}
        >
          <IDEBoardNav
            domainSlug={leftProps.domainSlug}
            domainId={leftProps.domainId}
            activeJourneyId={activeJourneyId}
            onJourneySelect={onJourneySelect}
            selectedDraftId={selectedDraftId}
            onDraftSelect={onDraftSelect}
            activeSessionId={activeSessionId}
            onSessionSelect={onSessionSelect}
            draftListVersion={draftListVersion}
            sessionListVersion={sessionListVersion}
            onKeeperSelect={onKeeperSelect}
            onSessionsLoaded={onSessionsLoaded}
            onJourneyCreated={onJourneyCreated}
            onKeeperCreated={onKeeperCreated}
            onAgentIdResolved={onAgentIdResolved}
          />
        </div>
      )}

      // Center — IDEBoardConversation: untouched conversation wrapper
      center={(_props) => (
        <IDEBoardConversation
          domainSlug={slug}
          domainId={domainId}
          activeSessionId={activeSessionId}
          onActiveSessionIdChange={setActiveSessionId}
          activeJourneyId={activeJourneyId}
          selectedDraftId={selectedDraftId}
          onKipContextSync={onKipContextSync}
          onSelectDraftInPlace={onDraftSelect}
          onMomentSelect={onMomentSelect}
          keeperName={keeperName}
          journeyName={journeyName}
          sessionTitle={activeSessionTitle}
          onSaveSessionTitle={onSaveSessionTitle}
          onServiceOpen={(service) => setActiveService(service ?? "cloud")}
        />
      )}

      // Right — 5-state custom panel (same logic as before, frosted glass applied here)
      right={(_props) => {
        // State 1: Service connection overlay
        if (activeService !== null) {
          return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
              <ServicesFrame
                initialService={activeService}
                onClose={() => setActiveService(null)}
              />
            </div>
          )
        }

        // State 2: Journey / Draft / Moment in context — IDEBoardContext owns the panel
        if (activeJourneyId || selectedDraftId || selectedMomentId) {
          return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
              <IDEBoardContext
                domainSlug={slug}
                domainId={domainId}
                activeJourneyId={activeJourneyId}
                selectedDraftId={selectedDraftId}
                selectedMomentId={selectedMomentId}
                onJourneySelect={onJourneySelect}
                onDraftSelect={onDraftSelect}
                onJourneyBack={onJourneyBack}
              />
            </div>
          )
        }

        // State 3: Explicit keeper selection from nav
        if (selectedKeeperId !== null) {
          return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
              <KeeperViewPanel
                keeper={{
                  name: keepers.find((k) => k.id === selectedKeeperId)?.title ?? keeperName ?? slug,
                  description: domainFrame?.theme?.tagline?.trim() ?? null,
                }}
                keeperId={selectedKeeperId}
                recentSessions={navSessions.slice(0, 3).map((s) => ({
                  id: s.id,
                  title: s.title,
                  updatedAt: s.updatedAt,
                }))}
                activeJourneys={journeys
                  .filter((j) => j.keeperId === selectedKeeperId)
                  .map((j) => ({
                    id: j.id,
                    title: j.name,
                    momentCount: j.momentCount ?? 0,
                  }))}
                onSessionSelect={onSessionSelect}
                onJourneySelect={onJourneySelect}
                onKeeperDeleted={() => {
                  setSelectedKeeperId(null)
                  setKeepers((prev) => prev.filter((k) => k.id !== selectedKeeperId))
                }}
                onSessionDeleted={(id) => setNavSessions((prev) => prev.filter((s) => s.id !== id))}
                onJourneyDeleted={(id) => setJourneys((prev) => prev.filter((j) => j.id !== id))}
                onNewSession={kipAgentId ? onNewSession : undefined}
              />
            </div>
          )
        }

        // State 4: Keeper in frame context focus (no explicit selection)
        if (keeperName !== null) {
          return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
              <KeeperViewPanel
                keeper={{
                  name: keeperName,
                  description: domainFrame?.theme?.tagline?.trim() ?? null,
                }}
                keeperId={frameCtx?.selection.activeKeeperId ?? null}
                recentSessions={navSessions.slice(0, 3).map((s) => ({
                  id: s.id,
                  title: s.title,
                  updatedAt: s.updatedAt,
                }))}
                activeJourneys={journeys
                  .filter((j) => j.keeperId === (frameCtx?.selection.activeKeeperId ?? null))
                  .map((j) => ({
                    id: j.id,
                    title: j.name,
                    momentCount: j.momentCount ?? 0,
                  }))}
                onSessionSelect={onSessionSelect}
                onJourneySelect={onJourneySelect}
                onSessionDeleted={(id) => setNavSessions((prev) => prev.filter((s) => s.id !== id))}
                onJourneyDeleted={(id) => setJourneys((prev) => prev.filter((j) => j.id !== id))}
                onNewSession={kipAgentId ? onNewSession : undefined}
              />
            </div>
          )
        }

        // State 5: Home — true default, nothing selected, no keeper in frame context
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
            <HomeViewPanel
              platformName={domainFrame?.theme?.wordmark?.trim() ?? "KE3P"}
              activeJourneys={journeys.map((j) => ({
                id: j.id,
                title: j.name,
                momentCount: j.momentCount ?? 0,
                domain: slug,
                keeperName: "",
              }))}
              onJourneySelect={onJourneySelect}
            />
          </div>
        )
      }}
    />
  )
}
