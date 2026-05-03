"use client"

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"

import { StyleScope } from "../../styles/StyleScope"
import { getBlobProxyUrl } from "../../../lib/blobProxy"
import { IDEBoardNav } from "./IDEBoardNav"
import { IDEBoardConversation } from "./IDEBoardConversation"
import { IDEBoardContext } from "./IDEBoardContext"
import type { IDEBoardKipContext } from "./ideBoardTypes"
import { KeeperBoardPanelGroup } from "../KeeperBoardPanelGroup"
import { ServicesFrame } from "./components/ServicesFrame"
import { KeeperViewPanel } from "../../components/panels/KeeperViewPanel"
import { HomeViewPanel } from "../../components/panels/HomeViewPanel"

type JourneySummary = { id: string; name: string; momentCount?: number; keeperId?: string | null }
type KeeperSummary = { id: string; title: string }
type NavSession = { id: string; title: string; updatedAt: string }

export function IDEBoard() {
  const { domainSlug, styleId, themeSlug, domainFrame, domainData } = useV0Shell()
  const frameCtx = useFrameContextOptional()
  const [briefOpen, setBriefOpen] = React.useState(false)

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
  // Sessions lifted from IDEBoardNav so banner title and rename stay in sync
  const [navSessions, setNavSessions] = React.useState<NavSession[]>([])
  // Lead Kip agent ID — resolved by IDEBoardNav, used for session creation
  const [kipAgentId, setKipAgentId] = React.useState<string | null>(null)

  const onServiceOpen = React.useCallback(
    (service?: "cloud" | "railway" | "vercel" | "github") => {
      setActiveService(service ?? "cloud")
    },
    [],
  )

  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(domainSlug)}`)
      .then((res: { id?: string }) => {
        if (!cancelled && res?.id) setDomainId(res.id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [domainSlug])

  // Load journeys + keepers (same as AgentBoardFrame)
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

  // Derive names from frameCtx selections (same pattern as AgentBoardFrame)
  const keeperName = keepers.find((k) => k.id === (frameCtx?.selection.activeKeeperId ?? null))?.title ?? null
  const journeyName = journeys.find((j) => j.id === (frameCtx?.selection.activeJourneyId ?? activeJourneyId))?.name ?? null
  const activeSessionTitle = navSessions.find((s) => s.id === activeSessionId)?.title ?? null

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
      // silent — user sees no change
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

  const coverImageUrl = domainData?.theme?.coverImage ?? null
  const coverImageMode = domainData?.theme?.coverImageMode ?? "cover"
  const displayCoverUrl = coverImageUrl ? getBlobProxyUrl(coverImageUrl) : null
  const pageBackground: React.CSSProperties = displayCoverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.08), hsl(var(--theme-surface-page) / 0.75)), url(${displayCoverUrl})`,
        backgroundPosition: coverImageMode === "tile" ? "0 0" : "center",
        backgroundSize: coverImageMode === "tile" ? "auto" : "cover",
        backgroundRepeat: coverImageMode === "tile" ? "repeat" : "no-repeat",
      }
    : {}

  const slug = domainSlug ?? ""

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug ?? null}>
      <div className="keeper-board-scope flex flex-col h-screen w-full overflow-hidden" style={pageBackground}>
        <KeeperTopBar
          onDomainClick={() => {}}
          onBriefClick={() => setBriefOpen((o) => !o)}
          isBriefOpen={briefOpen}
        />
        {briefOpen && domainFrame && (
          <DomainBriefSlideOver
            domainFrame={domainFrame}
            onClose={() => setBriefOpen(false)}
          />
        )}

        <div className="flex min-h-0 flex-1 flex-col px-6 pt-4 pb-8">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <KeeperBoardPanelGroup
              key={`ide-board-panels-${slug || "default"}`}
              boardKind="ide"
              domainSlug={slug}
              left={
                <div
                  className="flex h-full min-h-0 flex-col overflow-hidden"
                  style={{
                    background: "hsl(var(--theme-surface-panel) / 0.85)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
                  }}
                >
                  <IDEBoardNav
                    domainSlug={slug}
                    domainId={domainId}
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
              }
              center={
                <div
                  className="flex h-full min-h-0 flex-col overflow-hidden"
                  style={{ background: "transparent", borderRadius: "8px" }}
                >
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
                    onServiceOpen={onServiceOpen}
                  />
                </div>
              }
              right={
                <div
                  className="flex h-full min-h-0 flex-col overflow-hidden"
                  style={{
                    background: "hsl(var(--theme-surface-panel) / 0.85)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
                  }}
                >
                  {activeService !== null ? (
                    <ServicesFrame
                      initialService={activeService}
                      onClose={() => setActiveService(null)}
                    />
                  ) : (activeJourneyId || selectedDraftId || selectedMomentId) ? (
                    // Journey / Draft / Moment view state: delegate to IDEBoardContext
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
                  ) : selectedKeeperId !== null ? (
                    // Keeper view state: a specific keeper was clicked in the left nav
                    <KeeperViewPanel
                      keeper={{
                        name:
                          keepers.find((k) => k.id === selectedKeeperId)?.title ??
                          keeperName ??
                          slug,
                        description:
                          domainFrame?.theme?.tagline?.trim() ?? null,
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
                      onSessionDeleted={(id) => {
                        setNavSessions((prev) => prev.filter((s) => s.id !== id))
                      }}
                      onJourneyDeleted={(id) => {
                        setJourneys((prev) => prev.filter((j) => j.id !== id))
                      }}
                      onNewSession={kipAgentId ? onNewSession : undefined}
                    />
                  ) : keeperName !== null ? (
                    // Keeper view state: a keeper is in focus via frame context
                    <KeeperViewPanel
                      keeper={{
                        name: keeperName,
                        description:
                          domainFrame?.theme?.tagline?.trim() ?? null,
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
                      onSessionDeleted={(id) => {
                        setNavSessions((prev) => prev.filter((s) => s.id !== id))
                      }}
                      onJourneyDeleted={(id) => {
                        setJourneys((prev) => prev.filter((j) => j.id !== id))
                      }}
                      onNewSession={kipAgentId ? onNewSession : undefined}
                    />
                  ) : (
                    // Home view state: true default — nothing selected, no keeper in focus
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
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </StyleScope>
  )
}
