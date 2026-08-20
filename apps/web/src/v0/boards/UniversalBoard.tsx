"use client"

/**
 * UniversalBoard
 * ==============
 * KE3P · Keeper Platform · Universal Board — Master Orchestrator
 *
 * Three panels. This shape. This feeling. Consistent across every Board.
 *
 * Left panel   — Navigation. Treatment: orientation and confidence.
 * Center panel — Dialog Frame. Treatment: exchange and momentum.
 * Right panel  — Living Multi-Context Surface. Treatment: presence and intentional interaction.
 *
 * The content changes. The shape does not. The treatment does not.
 * A new Board in the future is a JSON entry and a context definition —
 * not a new component, not a new conversation about what the panels should do.
 *
 * Usage:
 * ------
 * The `center` render prop receives the resolved board state and returns the
 * conversation node. Existing boards pass their existing conversation component.
 * Future boards will use a standard UniversalConversation (to be built).
 *
 *   <UniversalBoard
 *     def={BUILD_BOARD_DEF}
 *     center={(props) => <UniversalConversation {...props} ... />}
 *   />
 *
 * The optional `right` render prop mirrors `center`. Return a node to override
   * Chronicle (UniversalViewPanel) for that render cycle. Return null to fall back to it.
   * Use for boards with conditional right panel content — e.g. ServicesFrame
   * when a service connection is active on Build Board.
 *
 * CRITICAL RULES:
 * - domainId is resolved once, here, at board root. Never resolved by panels.
 * - All colors via hsl(var(--theme-*)) only. Zero hardcoded hex.
 * - Board owns collapse state. Panels do not own their own visibility.
 */

import * as React from "react"
import { useV0Shell } from "../shell/V0ShellContext"
import { StyleScope } from "../styles/StyleScope"
import { getBlobProxyUrl } from "../../lib/blobProxy"
import { useBoardThemeRegistration } from "../themes/useBoardThemeRegistration"
import { KeeperTopBar } from "../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../components/DomainBriefSlideOver"
import { KeeperBoardPanelGroup } from "./KeeperBoardPanelGroup"
import type { KeeperBoardKind } from "./KeeperBoardPanelGroup"
import { UniversalNavPanel } from "./UniversalNavPanel"
import { UniversalViewPanel } from "./panels/UniversalViewPanel"
import { UniversalBoardProvider, useUniversalBoard } from "./UniversalBoardContext"
import { DesignerDraftProvider } from "./DesignerDraftContext"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import { UniversalConversation } from "./UniversalConversation"
import { useAuth } from "../../context/AuthContext"
import { PanelErrorBoundary } from "../components/PanelErrorBoundary"
import { useDomainSwitcher } from "./domain/DomainSwitcherOverlay"
import { isMemberMobileBoard, usesAdaptiveMobileBoardLayout, type WorkspaceBoardId } from "./workspaceBoardNav"
import { GuidedArrivalOrchestrator } from "../guidedArrival/GuidedArrivalOrchestrator"
import { useIsMobile } from "../../mobile/hooks/useIsMobile"
import { RealmArrivalProvider } from "../realm/RealmArrivalContext"
import { prefetchBoardNavData } from "./boardNavDataCache"
import {
  getCachedDomainBySlug,
  getDomainShellCacheVersion,
  resolveDomainCoverUrl,
  subscribeDomainShellCache,
} from "./domain/domainShellCache"
import { extractDomainThemeCover } from "@keeper/shared"
import { DOMAIN_THEME_SLUG } from "../themes/constants"
import { BoardMobileChronicleOverlay } from "./components/BoardMobileChronicleOverlay"
import { BoardMobileNavDrawer } from "./components/BoardMobileNavDrawer"
import { getCachedBoardNavData } from "./boardNavDataCache"
import { PwaInstallPrompt } from "../../mobile/pwa"
import { hasUnreadChronicle, markChronicleViewed } from "../presence/chronicleDocument/chronicleMobile"
import "./board-mobile.css"

function isResolvedDomainId(id: string | null | undefined): id is string {
  return !!id && !String(id).startsWith("fallback-")
}

function domainRecordMatchesSlug(
  record: { slug?: string | null } | null | undefined,
  slug: string,
): boolean {
  const recordSlug = record?.slug?.trim().toLowerCase()
  if (!recordSlug) return false
  return recordSlug === slug.trim().toLowerCase()
}

// ─── Center Panel Render Prop ─────────────────────────────────────────────────

/**
 * Props delivered to the center panel render prop.
 * The conversation component uses these to wire session, selection, and context.
 */
export interface UniversalBoardCenterProps {
  domainId: string | null
  domainSlug: string
  domainName: string

  // Active selection — read by the conversation to build context
  activeSessionId: string | null
  selectedDialogId: string | null
  selectedJourneyId: string | null
  selectedMomentId: string | null
  selectedKeeperId: string | null
  selectedDraftId: string | null
  selectedAgentId: string | null
  selectedServiceSlug: string | null

  // Selection actions — conversation fires these to sync state back to board
  onSessionSelect: (id: string | null) => void
  onJourneySelect: (id: string) => void
  onMomentSelect: (id: string) => void
  onKeeperSelect: (id: string) => void
  onDraftSelect: (id: string) => void
  onAgentSelect: (id: string) => void
  onServiceOpen: (slug: string) => void
  /** Clears all entity selections — returns the right panel to idle/domain presence. */
  clearSelection: () => void
  /** Bump nav draft list after agent actions create or update drafts. */
  onDraftListRefresh?: () => void
  /** Bump nav journey list after agent actions create journeys or moments. */
  onJourneyListRefresh?: () => void
  /** Adaptive mobile — Playbill owns domain LIVE; suppress Dialog identity banner. */
  suppressMobileDomainBanner?: boolean
}

// ─── Left Panel Render Prop ───────────────────────────────────────────────────

/**
 * Props delivered to the left panel render prop.
 * Provides resolved domain identity — sufficient for any nav panel implementation.
 * Board-local selection state is available from UniversalBoardContext if needed.
 */
export interface UniversalBoardLeftProps {
  domainId: string | null
  domainSlug: string
  domainName: string
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UniversalBoardProps {
  /** The board definition — drives what each panel shows and how it behaves. */
  def: UniversalBoardDef

  /**
   * Optional left panel render prop.
   * When provided, replaces UniversalNavPanel entirely.
   * Use for boards with specialized nav requirements —
   * e.g. IDEBoardNav (sessions, optimistic creation) or DomainBoard (board switcher + frames list).
   * When omitted, UniversalNavPanel renders with the board's context and selection wiring.
   */
  left?: (props: UniversalBoardLeftProps) => React.ReactNode

  /**
   * Center panel render prop — the conversation frame.
   * When provided, overrides the default UniversalConversation.
   * When omitted, UniversalConversation renders with parameters from def.conversation.
   * This is the exchange surface: Banner · Dialog · Composer.
   */
  center?: (props: UniversalBoardCenterProps) => React.ReactNode

  /**
   * Optional right panel render prop.
   * Receives the same UniversalBoardCenterProps as center.
   * When provided and returns non-null, replaces Chronicle (UniversalViewPanel) entirely.
   * When omitted or returns null, Chronicle renders normally.
   *
   * Use for boards with conditional right panel content —
   * e.g. ServicesFrame overlay in IDE Board when a service is active.
   * Returning null lets the right panel fall back to Chronicle
   * for idle/journey/keeper presence.
   */
  right?: (props: UniversalBoardCenterProps) => React.ReactNode | null

  /**
   * Optional callback for when the domain label in KeeperTopBar is clicked.
   * Default: no-op. Pass to open a domain switcher or other top-bar action.
   */
  onDomainClick?: () => void

  /**
   * Optional additional nav list version counters.
   * Increment to trigger re-fetch of specific nav sections from outside the board.
   */
  navVersions?: {
    dialogListVersion?: number
    journeyListVersion?: number
    keeperListVersion?: number
    draftListVersion?: number
  }
}

// ─── Board Shell (inner — consumes UniversalBoardContext) ─────────────────────

function UniversalBoardShell({
  def,
  left: leftRenderProp,
  center,
  right: rightRenderProp,
  onDomainClick,
  navVersions,
}: UniversalBoardProps) {
  const { domainSlug, styleId, themeSlug: urlThemeSlug, domainFrame, domainData, shellMode } = useV0Shell()
  // Domain-resolved supplies Treatment accent only on boards (Warm Dark glass shell stays).
  // Full theme replace is reserved for explicit ?theme= developer preview.
  const themeSlug = urlThemeSlug ?? DOMAIN_THEME_SLUG
  const themeApply = urlThemeSlug ? "full" : "treatment"
  const {
    selection,
    actions,
    navCollapsed,
    onToggleNavCollapsed,
    chronicleEngagement,
    dialogIngest,
  } = useUniversalBoard()
  const { isAdmin } = useAuth()
  const isMobile = useIsMobile()
  const isRealmHome = def.boardId === "realm" && shellMode === "home"
  const useMobilePanelLayout = usesAdaptiveMobileBoardLayout(def.boardId, isMobile)
  const [navDrawerOpen, setNavDrawerOpen] = React.useState(false)
  const [chronicleOverlayOpen, setChronicleOverlayOpen] = React.useState(false)

  // Chronicle Acts / engagement — open overlay instead of a Chronicle tab.
  React.useEffect(() => {
    if (!useMobilePanelLayout) return
    if (chronicleEngagement != null || dialogIngest != null) {
      setChronicleOverlayOpen(true)
    }
  }, [useMobilePanelLayout, chronicleEngagement, dialogIngest])

  React.useEffect(() => {
    if (chronicleOverlayOpen && selection.selectedDialogId) {
      markChronicleViewed(selection.selectedDialogId)
    }
  }, [chronicleOverlayOpen, selection.selectedDialogId])

  // Gloss from Chronicle → focused Dialog; close the sheet so the conversation is visible.
  React.useEffect(() => {
    if (!useMobilePanelLayout) return
    if (selection.draftDiscussAnchor) {
      setChronicleOverlayOpen(false)
    }
  }, [useMobilePanelLayout, selection.draftDiscussAnchor])

  const focusMobileDialogPanel = React.useCallback(() => {
    setNavDrawerOpen(false)
    setChronicleOverlayOpen(false)
  }, [])

  const openNavDrawer = React.useCallback(() => {
    setChronicleOverlayOpen(false)
    setNavDrawerOpen(true)
  }, [])

  const openChronicleOverlay = React.useCallback(() => {
    setNavDrawerOpen(false)
    // Domain idle when nothing Document/Journey/Moment/Keeper scoped —
    // prevents agent-only selection from painting Session lists in Chronicle.
    const hasChronicleScope = !!(
      selection.selectedDialogId
      || selection.selectedDraftId
      || selection.selectedMomentId
      || selection.selectedLibraryItemId
      || selection.selectedJourneyId
      || selection.selectedKeeperId
      || selection.selectedPathId
    )
    if (!hasChronicleScope) {
      actions.clearSelection()
    }
    setChronicleOverlayOpen(true)
    if (selection.selectedDialogId) markChronicleViewed(selection.selectedDialogId)
  }, [
    actions,
    selection.selectedDialogId,
    selection.selectedDraftId,
    selection.selectedMomentId,
    selection.selectedLibraryItemId,
    selection.selectedJourneyId,
    selection.selectedKeeperId,
    selection.selectedPathId,
  ])

  // Deep-link chips / History → Document bump this request id to open the overlay.
  React.useEffect(() => {
    if (!selection.chronicleOpenRequestId) return
    openChronicleOverlay()
  }, [selection.chronicleOpenRequestId, openChronicleOverlay])

  const closeNavDrawer = React.useCallback(() => setNavDrawerOpen(false), [])
  const closeChronicleOverlay = React.useCallback(() => setChronicleOverlayOpen(false), [])

  const handleGoHome = React.useCallback(() => {
    actions.clearSelection()
    actions.closeChronicleEngagement()
    actions.clearDraftDiscussAnchor()
  }, [actions])

  const targetBoardId = def.boardId as WorkspaceBoardId
  const { openSwitcher, switcherOverlay, isSwitcherOpen } = useDomainSwitcher(targetBoardId)

  useBoardThemeRegistration()

  const [briefOpen, setBriefOpen] = React.useState(false)
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [domainName, setDomainName] = React.useState<string>("")
  const activeDialog = React.useMemo(() => {
    if (!domainId || !selection.selectedDialogId) return null
    const dialogs = getCachedBoardNavData<Array<{ id: string; title?: string | null; updated_at?: string | null; updatedAt?: string | null }>>(domainId, "dialogs")
    return dialogs?.find((dialog) => dialog.id === selection.selectedDialogId) ?? null
  }, [domainId, selection.selectedDialogId])

  const onDraftListRefresh = React.useCallback(() => {
    actions.bumpDraftNav()
  }, [actions])

  const onJourneyListRefresh = React.useCallback(() => {
    actions.bumpJourneyNav()
  }, [actions])

  const effectiveDraftListVersion =
    (navVersions?.draftListVersion ?? 0) + selection.draftNavRevision
  const effectiveJourneyListVersion =
    (navVersions?.journeyListVersion ?? 0) + selection.journeyNavRevision
  const effectiveDialogListVersion =
    (navVersions?.dialogListVersion ?? 0) + selection.dialogNavRevision

  const slug = domainSlug ?? ""

  const prevBoardIdRef = React.useRef(def.boardId)
  const prevSlugRef = React.useRef(slug)
  React.useEffect(() => {
    if (prevBoardIdRef.current === def.boardId) return
    prevBoardIdRef.current = def.boardId
    actions.clearSelection()
    actions.onSessionSelect(null)
    actions.closeChronicleEngagement()
  }, [def.boardId, actions])

  React.useEffect(() => {
    if (prevSlugRef.current === slug) return
    prevSlugRef.current = slug
    setBriefOpen(false)

    const cached = getCachedDomainBySlug(slug)
    if (cached?.id && !String(cached.id).startsWith("fallback-")) {
      setDomainId(cached.id)
      const name = (cached.displayName ?? cached.name ?? "").trim()
      if (name) setDomainName(name)
      prefetchBoardNavData(cached.id)
    } else {
      setDomainId(null)
    }
  }, [slug])

  // ── domainId resolution — single point, never delegated to panels ──────────
  // V0Shell owns the by-slug fetch; sync from shell domainData to avoid duplicate round-trips.
  React.useEffect(() => {
    if (!slug) return
    const r = domainData as
      | { id?: string; slug?: string; name?: string; displayName?: string }
      | null
      | undefined
    if (!domainRecordMatchesSlug(r, slug)) return
    if (!isResolvedDomainId(r?.id)) return
    setDomainId(r.id)
    const name = (r.displayName ?? r.name ?? "").trim()
    if (name) setDomainName(name)
  }, [slug, domainData])

  React.useEffect(() => {
    if (!isResolvedDomainId(domainId)) return

    const slices = {
      journeys: !!def.nav.sections.journeys,
      keepers: !!def.nav.sections.keepers,
      dialogs: !!def.nav.sections.dialogs,
      drafts: !!def.nav.sections.drafts,
      agents:
        !!def.nav.sections.agents ||
        (def.conversation.kipMode === "domain" &&
          def.conversation.dialogCueing === "directed"),
      library: !!def.nav.sections.library,
    }

    const run = () => prefetchBoardNavData(domainId, slices)

    if (typeof requestIdleCallback !== "undefined") {
      const idleId = requestIdleCallback(run, { timeout: 2500 })
      return () => cancelIdleCallback(idleId)
    }

    const timeoutId = window.setTimeout(run, 150)
    return () => window.clearTimeout(timeoutId)
  }, [domainId, def])

  // Sync domain name from frame/domain data when available — avoids extra round trip
  React.useEffect(() => {
    const fromFrame = (domainFrame?.theme as Record<string, unknown> | undefined)?.wordmark
    const domainRecord = domainData as { slug?: string; name?: string } | undefined
    const name =
      (typeof fromFrame === "string" ? fromFrame : null)?.trim() ??
      (domainRecordMatchesSlug(domainRecord, slug)
        ? domainRecord?.name?.trim()
        : null) ??
      ""
    if (name) setDomainName(name)
  }, [domainFrame, domainData, slug])

  // ── Density — applied when def.access.requiresDensity is true ─────────────
  const DENSITY_KEY = "keeper-density"
  type KeeperDensity = "compact" | "default" | "comfortable"

  const [density] = React.useState<KeeperDensity>(() => {
    if (!def.access.requiresDensity) return "default"
    if (typeof window === "undefined") return "default"
    try {
      const v = localStorage.getItem(DENSITY_KEY)
      if (v === "compact" || v === "comfortable") return v
    } catch { /* ignore */ }
    return "default"
  })

  React.useEffect(() => {
    if (!def.access.requiresDensity) return
    document.documentElement.setAttribute("data-density", density)
    try { localStorage.setItem(DENSITY_KEY, density) } catch { /* ignore */ }
  }, [def.access.requiresDensity, density])

  // ── Background ─────────────────────────────────────────────────────────────
  // Atmosphere is domain-shell only. Cast / instrument selection must never change it.
  // Subscribe to shell cache so late cover prefetch paints without unrelated re-renders.
  const shellCacheVersion = React.useSyncExternalStore(
    subscribeDomainShellCache,
    getDomainShellCacheVersion,
    getDomainShellCacheVersion,
  )

  const coverImageMode =
    domainRecordMatchesSlug(domainData as { slug?: string | null } | null | undefined, slug)
      ? ((domainData as { theme?: { coverImageMode?: string } } | undefined)?.theme?.coverImageMode ?? "cover")
      : "cover"

  const displayCoverUrl = React.useMemo(() => {
    if (!slug) return null

    // Shell React state — only when it still matches the URL slug (soft-switch race guard).
    if (domainRecordMatchesSlug(domainData as { slug?: string | null } | null | undefined, slug)) {
      const fromShell = extractDomainThemeCover(
        (domainData as { theme?: unknown } | null | undefined)?.theme,
      ).coverImage?.trim()
      if (fromShell) return getBlobProxyUrl(fromShell)
    }

    // Per-slug cache / frame background — never another domain's cover.
    return resolveDomainCoverUrl(slug)
  }, [slug, domainData, shellCacheVersion])

  const pageBackground: React.CSSProperties =
    isRealmHome || !displayCoverUrl
      ? { background: "hsl(var(--theme-surface-page))" }
      : {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.08), hsl(var(--theme-surface-page) / 0.75)), url(${displayCoverUrl})`,
        backgroundPosition: coverImageMode === "tile" ? "0 0" : "center",
        backgroundSize: coverImageMode === "tile" ? "auto" : "cover",
        backgroundRepeat: coverImageMode === "tile" ? "repeat" : "no-repeat",
      }

  // ── Admin guard — enforced at shell level when def.access.isAdminOnly ──────
  if (def.access.isAdminOnly && !isAdmin) {
    return (
      <StyleScope styleId={styleId} themeSlug={themeSlug ?? null} themeApply={themeApply}>
        <div
          className="flex h-screen items-center justify-center"
          style={{ background: "hsl(var(--theme-surface-page))" }}
        >
          <div
            className="rounded-xl px-8 py-6 text-center"
            style={{
              background: "hsl(var(--theme-surface-panel))",
              border: "1px solid hsl(var(--theme-border-soft) / 0.4)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
              Access restricted
            </p>
            <p className="mt-1 text-xs" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              {def.displayName} is available to Platform Admins only.
            </p>
          </div>
        </div>
      </StyleScope>
    )
  }

  // ── Panel group board kind — maps boardId to known layout presets ──────────
  // build and agent have distinct persisted layout preferences.
  // All other board IDs default to Build layout ratios.
  const boardKind: KeeperBoardKind =
    def.boardId === "agent" ? "agent" : "build"

  // ── Left panel — resolved identity for render prop ─────────────────────────
  const leftProps: UniversalBoardLeftProps = {
    domainId,
    domainSlug: slug,
    domainName,
  }

  // ── Board context — delivered to center and right render props ───────────
  const centerProps: UniversalBoardCenterProps = {
    domainId,
    domainSlug: slug,
    domainName,
    activeSessionId: selection.activeSessionId,
    selectedDialogId: selection.selectedDialogId,
    selectedJourneyId: selection.selectedJourneyId,
    selectedMomentId: selection.selectedMomentId,
    selectedKeeperId: selection.selectedKeeperId,
    selectedDraftId: selection.selectedDraftId,
    selectedAgentId: selection.selectedAgentId,
    selectedServiceSlug: selection.selectedServiceSlug,
    onSessionSelect: actions.onSessionSelect,
    onJourneySelect: actions.onJourneySelect,
    onMomentSelect: actions.onMomentSelect,
    onKeeperSelect: actions.onKeeperSelect,
    onDraftSelect: actions.onDraftSelect,
    onAgentSelect: actions.onAgentSelect,
    onServiceOpen: actions.onServiceOpen,
    clearSelection: actions.clearSelection,
    onDraftListRefresh,
    onJourneyListRefresh,
    suppressMobileDomainBanner: useMobilePanelLayout,
  }

  // ── Right panel — render prop or Chronicle ─────────────────────────────────
  // If a right render prop is provided and returns non-null, use it directly.
  // The render prop is responsible for its own styling (including frosted glass if wanted).
  // If omitted or returns null, Chronicle (UniversalViewPanel) handles the right panel.
  const rightOverrideNode = rightRenderProp ? rightRenderProp(centerProps) : null
  const rightNode = (
    <PanelErrorBoundary panel="chronicle">
      {rightOverrideNode ?? (
        <UniversalViewPanel
          def={def}
          domainId={domainId}
          domainName={domainName}
          domainSlug={slug || undefined}
        />
      )}
    </PanelErrorBoundary>
  )

  const leftNode = (
    <PanelErrorBoundary panel="nav">
      {leftRenderProp
        ? leftRenderProp(leftProps)
        : (
            <UniversalNavPanel
              domainId={domainId}
              domainSlug={slug}
              domainName={domainName}
              def={def}
              selectedDialogId={selection.selectedDialogId}
              selectedJourneyId={selection.selectedJourneyId}
              selectedPathId={selection.selectedPathId}
              selectedKeeperId={selection.selectedKeeperId}
              selectedDraftId={selection.selectedDraftId}
              selectedAgentId={selection.selectedAgentId}
              selectedServiceSlug={selection.selectedServiceSlug}
              selectedKeyId={selection.selectedKeyId}
              selectedCapabilityId={selection.selectedCapabilityId}
              selectedLibraryItemId={selection.selectedLibraryItemId}
              selectedGlossaryId={selection.selectedGlossaryId}
              selectedSessionId={selection.activeSessionId}
              onDialogSelect={(id) => {
                actions.onDialogSelect(id)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onSessionSelect={(id) => {
                actions.onSessionSelect(id)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onJourneySelect={(id) => {
                actions.onJourneySelect(id)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onKeeperSelect={(id) => {
                actions.onKeeperSelect(id)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onDraftSelect={(id) => {
                actions.onDraftSelect(id)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onAgentSelect={(id) => {
                actions.onAgentSelect(id)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onServiceOpen={(serviceSlug) => {
                actions.onServiceOpen(serviceSlug)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onKeySelect={(id) => {
                actions.onKeySelect(id)
                if (useMobilePanelLayout) {
                  closeNavDrawer()
                  openChronicleOverlay()
                }
              }}
              onCapabilitySelect={(id) => {
                actions.onCapabilitySelect(id)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onLibraryItemSelect={(id) => {
                actions.onLibraryItemSelect(id)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onGlossarySelect={() => {
                actions.onGlossarySelect()
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              onMomentSelect={(id) => {
                actions.onMomentSelect(id)
                if (useMobilePanelLayout) closeNavDrawer()
              }}
              collapsed={useMobilePanelLayout ? false : navCollapsed}
              onToggleCollapsed={onToggleNavCollapsed}
              dialogListVersion={effectiveDialogListVersion}
              journeyListVersion={effectiveJourneyListVersion}
              keeperListVersion={selection.keeperNavRevision}
              draftListVersion={effectiveDraftListVersion}
              draftNavRowPatch={selection.draftNavRowPatch}
              keyListVersion={selection.keyNavRevision}
              keyNavRowPatch={selection.keyNavRowPatch}
              capabilityListVersion={selection.capabilityNavRevision}
              capabilityNavRowPatch={selection.capabilityNavRowPatch}
              libraryListVersion={selection.libraryNavRevision}
              libraryNavRowPatch={selection.libraryNavRowPatch}
              keeperNavRowPatch={selection.keeperNavRowPatch}
              agentListVersion={selection.agentNavRevision}
              agentNavRowPatch={selection.agentNavRowPatch}
            />
          )}
    </PanelErrorBoundary>
  )

  const centerNode = (
    <PanelErrorBoundary panel="dialog">
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden"
        style={{ background: "transparent", borderRadius: useMobilePanelLayout ? undefined : "8px" }}
      >
        {center
          ? center(centerProps)
          : <UniversalConversation def={def} {...centerProps} />}
      </div>
    </PanelErrorBoundary>
  )

  const themePrimary = domainFrame?.theme?.colors?.primary
  const livePulseColor =
    typeof themePrimary === "string" && themePrimary.trim()
      ? themePrimary.trim()
      : undefined

  return (
    <StyleScope
      key={`board-theme-${slug || "none"}-${themeSlug ?? "none"}-${themeApply}`}
      styleId={styleId}
      themeSlug={themeSlug ?? null}
      themeApply={themeApply}
    >
      <div
        className={`keeper-board-scope flex flex-col w-full overflow-hidden ${useMobilePanelLayout ? "board-mobile-shell-height" : "h-screen"}`}
        style={pageBackground}
      >
        <KeeperTopBar
          onDomainClick={onDomainClick ?? openSwitcher}
          onGoHome={handleGoHome}
          onBriefClick={() => setBriefOpen((o) => !o)}
          isBriefOpen={briefOpen}
          isPlaybillOpen={isSwitcherOpen}
          playbillDropdown={switcherOverlay}
          onOpenNav={useMobilePanelLayout ? openNavDrawer : undefined}
          showLivePulse={useMobilePanelLayout}
          livePulseColor={livePulseColor}
          dialogTitle={activeDialog?.title?.trim() || null}
          dialogUnread={activeDialog ? hasUnreadChronicle(selection.selectedDialogId ?? "", activeDialog.updated_at ?? activeDialog.updatedAt) : false}
          onOpenChronicle={openChronicleOverlay}
        />

        {isMobile && isMemberMobileBoard(def.boardId) ? (
          <GuidedArrivalOrchestrator
            focusMobileKipTab={useMobilePanelLayout ? focusMobileDialogPanel : undefined}
          />
        ) : null}

        {briefOpen && domainFrame && (
          <DomainBriefSlideOver
            domainFrame={domainFrame}
            onClose={() => setBriefOpen(false)}
          />
        )}

        <div
          className={
            useMobilePanelLayout
              ? "board-mobile-layout flex min-h-0 flex-1 flex-col px-0 pt-1 pb-0"
              : "flex min-h-0 flex-1 flex-col px-6 pt-4 pb-8"
          }
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {useMobilePanelLayout ? (
              <>
                <div className="keeper-board-panel-focus">
                  {centerNode}
                </div>
                <BoardMobileNavDrawer open={navDrawerOpen} onClose={closeNavDrawer}>
                  {leftNode}
                </BoardMobileNavDrawer>
                <BoardMobileChronicleOverlay
                  open={chronicleOverlayOpen}
                  onClose={closeChronicleOverlay}
                >
                  {rightNode}
                </BoardMobileChronicleOverlay>
                <PwaInstallPrompt
                  title="Install Keeper"
                  description="Add Keeper to your home screen for quick access."
                />
              </>
            ) : (
              <KeeperBoardPanelGroup
                boardKind={boardKind}
                domainSlug={slug}
                left={leftNode}
                center={centerNode}
                right={rightNode}
              />
            )}
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

// ─── UniversalBoard — public entry point ──────────────────────────────────────

/**
 * UniversalBoard
 *
 * The single board shape. Pass any UniversalBoardDef and it renders
 * Left · Center · Right with the correct treatment character for each panel.
 *
 * Context is provided inside. The board resolves domain identity, manages
 * selection state, and delivers both to all three panels.
 */
function boardNeedsDraftContext(def: UniversalBoardDef): boolean {
  return (
    def.conversation.kipMode === "designer" ||
    def.nav.sections.boardDefs === true
  )
}

export function UniversalBoard(props: UniversalBoardProps) {
  const shell = useV0Shell()
  const isRealmHome = props.def.boardId === "realm" && shell.shellMode === "home"
  const needsDraft = boardNeedsDraftContext(props.def)
  const shellNode = needsDraft ? (
    <DesignerDraftProvider>
      <UniversalBoardShell {...props} />
    </DesignerDraftProvider>
  ) : (
    <UniversalBoardShell {...props} />
  )
  return (
    <UniversalBoardProvider>
      {isRealmHome ? <RealmArrivalProvider>{shellNode}</RealmArrivalProvider> : shellNode}
    </UniversalBoardProvider>
  )
}
