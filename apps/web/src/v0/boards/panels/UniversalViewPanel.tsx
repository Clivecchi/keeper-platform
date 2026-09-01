"use client"

/**
 * UniversalViewPanel — Chronicle
 * ================================
 * KE3P · Keeper Platform · Universal Board — Right Panel
 *
 * Chronicle is the right panel for all Universal Boards.
 * Every selection routes through KeeperPresence — no board-specific renderers.
 *
 * Three elements:
 *   Trail Bar    — permanent top, history stack (max 3 visible), feed indicator, lateral slide
 *   Panel Body   — KeeperPresence for every subject type, opacity dissolve on shift
 *   Idle State   — KeeperPresence objectType="domain" (never empty)
 *
 * Panel Body renders from live board selection (resolveChronicleView) on every frame.
 * Trail history is breadcrumb UI only — it does not gate Chronicle content.
 *
 * Motion — Framer Motion only at this tier:
 *   Lateral slide on Trail Bar history change (200ms entry, 140ms exit)
 *   Opacity dissolve on Panel Body context shift (200ms entry, 140ms exit)
 *
 * CRITICAL RULES:
 * - Never call /api/domains/by-slug — domainId is always received as a prop.
 * - All colors via hsl(var(--theme-*)) only. Zero hardcoded hex.
 * - Presence surfaces fetch their own data — the panel is self-sufficient.
 */

import * as React from "react"
import { useV0ShellOptional } from "../../shell/V0ShellContext"
import { motion, AnimatePresence } from "framer-motion"
import { apiFetch } from "../../../lib/api"
import { loadJourneyNavRows, getCachedBoardNavData } from "../boardNavDataCache"
import { useUniversalBoardOptional } from "../UniversalBoardContext"
import {
  chronicleSubjectKey,
  chronicleSubjectToLegacyKindId,
  isDocumentBearingDialogTitleSource,
  resolveChronicleView,
  type ChronicleLegacyKind,
} from "@keeper/shared"
import type { UniversalBoardDef } from "../UniversalBoardDefinition"
import { ChroniclePresenceView } from "../../presence/ChroniclePresenceView"
import type { PresenceLayout } from "../../presence/types"
import { ChronicleEngagementSurface } from "../engagement/ChronicleEngagementSurface"
import { DialogIngestPresence } from "../../presence/DialogIngestPresence"
import {
  resolveDomainTreatment,
  type ResolvedDomainTreatment,
} from "../../treatment/resolveDomainTreatment"
import { RealmHomeChronicle } from "../../realm/RealmHomeChronicle"
import { useRealmArrivalOptional } from "../../realm/RealmArrivalContext"
import { LibrarySharedContextRoadmapPanel } from "../../presence/chronicleDocument/LibrarySharedContextRoadmapPanel"
import { ReachChroniclePresence } from "../../presence/ReachChroniclePresence"
import { ThemeChroniclePresence } from "../../presence/ThemeChroniclePresence"
import { OnStageObjectList } from "../../composer/OnStageObjectList"
import { shouldRenderRealmDocumentChronicle } from "../workspaceSurface"

// ─── Trail Types ──────────────────────────────────────────────────────────────

type TrailKind = ChronicleLegacyKind
type TrailDirection = "forward" | "back"

interface TrailEntry {
  /** Unique key — also used as AnimatePresence key and label-resolution target. */
  key: string
  kind: TrailKind
  id: string | null
  /** Display label — set initially to kind name, updated asynchronously by views. */
  label: string
}

const TRAIL_KIND_TO_OBJECT_TYPE: Record<TrailKind, string> = {
  domain: "domain",
  dialog: "dialog",
  journey: "journey",
  path: "path",
  moment: "moment",
  keeper: "keeper",
  draft: "draft",
  agent: "agent",
  service: "service",
  key: "key",
  capability: "capability",
  library: "library",
  soleMemory: "soleMemory",
  boardDef: "boardDef",
  glossary: "glossary",
}

const CONFIG_LAYOUT_KINDS = new Set<TrailKind>(["boardDef"])

// ─── API data shapes ──────────────────────────────────────────────────────────

type JourneyBrief = {
  id: string
  name: string
  momentCount?: number
}

// ─── Trail Bar ────────────────────────────────────────────────────────────────
// Permanent top. History stack (max 3 visible). Feed indicator right.
// Lateral slide 200ms entry / 140ms exit on history change.

interface TrailBarProps {
  entries: TrailEntry[]
  currentIndex: number
  onNavigate: (index: number) => void
  feedCount: number
  direction: TrailDirection
  onFeedClick?: () => void
}

function TrailBar({
  entries,
  currentIndex,
  onNavigate,
  feedCount,
  direction,
  onFeedClick,
}: TrailBarProps) {
  const windowStart = Math.max(0, currentIndex - 2)
  const shown = entries.slice(windowStart, currentIndex + 1)
  const hasOlder = windowStart > 0

  const xIn = direction === "forward" ? 14 : -14
  const xOut = direction === "forward" ? -14 : 14

  return (
    <div
      className="keeper-chronicle-trail-bar shrink-0 flex items-center gap-1 px-3 py-2"
      style={{
        minHeight: 40,
      }}
    >
      {hasOlder && (
        <button
          type="button"
          onClick={() => onNavigate(Math.max(0, windowStart - 1))}
          className="shrink-0 text-[13px] font-medium px-1 leading-none transition-opacity hover:opacity-80"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
          aria-label="Navigate to older history"
        >
          ···
        </button>
      )}

      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        <AnimatePresence initial={false} mode="sync">
          {shown.map((entry, i) => {
            const globalIdx = windowStart + i
            const isCurrent = globalIdx === currentIndex
            return (
              <motion.button
                key={entry.key}
                type="button"
                layout
                onClick={() => onNavigate(globalIdx)}
                initial={{ x: xIn, opacity: 0 }}
                animate={{
                  x: 0,
                  opacity: 1,
                  transition: { duration: 0.2, ease: "easeOut" },
                }}
                exit={{
                  x: xOut,
                  opacity: 0,
                  transition: { duration: 0.14, ease: "easeIn" },
                }}
                className="shrink-0 text-[12px] font-medium px-2.5 py-1 rounded-full transition-colors truncate"
                style={{
                  maxWidth: 100,
                  background: isCurrent
                    ? "hsl(var(--theme-surface-elevated) / 0.55)"
                    : "hsl(var(--theme-surface-elevated) / 0.25)",
                  color: isCurrent
                    ? "hsl(var(--theme-ink-primary))"
                    : "hsl(var(--theme-ink-tertiary))",
                  border: `1px solid ${
                    isCurrent
                      ? "hsl(var(--theme-border-soft) / 0.45)"
                      : "hsl(var(--theme-border-soft) / 0.25)"
                  }`,
                }}
              >
                {entry.label}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {feedCount > 0 && (
        <button
          type="button"
          onClick={onFeedClick}
          className="shrink-0 flex items-center gap-1 ml-1 transition-opacity hover:opacity-80"
          aria-label="View domain feed"
        >
          <span
            className="keeper-chronicle-feed-dot w-1.5 h-1.5 rounded-full"
            style={{ background: "hsl(var(--theme-accent-primary))" }}
          />
          <span
            className="text-[11px] tabular-nums font-medium"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {feedCount}
          </span>
        </button>
      )}
    </div>
  )
}

// ─── Chronicle record view ────────────────────────────────────────────────────
// Universal path — every subject type calls KeeperPresence via ChroniclePresenceView.

interface ChronicleRecordViewProps {
  objectType: string
  objectId: string
  domainId: string | null
  domainSlug?: string
  domainDisplayName?: string
  boardId?: string
  layout?: PresenceLayout
  onJourneySelect?: (id: string) => void
  onPathSelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
  onSessionSelect?: (id: string) => void
  onLabelResolved: (key: string, label: string) => void
  trailKey: string
  treatment: ResolvedDomainTreatment
}

function ChronicleRecordView({
  objectType,
  objectId,
  domainId,
  domainSlug,
  domainDisplayName,
  boardId,
  layout = "focus",
  onJourneySelect,
  onPathSelect,
  onMomentSelect,
  onSessionSelect,
  onKeySelect,
  onLabelResolved,
  trailKey,
  treatment,
}: ChronicleRecordViewProps & { onKeySelect?: (id: string) => void }) {
  if (!domainId) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Waiting for domain context…
        </p>
      </div>
    )
  }

  return (
    <ChroniclePresenceView
      objectType={objectType}
      objectId={objectId}
      domainId={domainId}
      domainSlug={domainSlug}
      domainDisplayName={domainDisplayName}
      boardId={boardId}
      layout={layout}
      density="standard"
      treatment={treatment}
      onLabelResolved={(label) => onLabelResolved(trailKey, label)}
      onJourneySelect={onJourneySelect}
      onPathSelect={onPathSelect}
      onMomentSelect={onMomentSelect}
      onSessionSelect={onSessionSelect}
      onKeySelect={onKeySelect}
    />
  )
}

// ─── PanelBody ────────────────────────────────────────────────────────────────
// Universal router — KeeperPresence for every trail kind. Opacity dissolve on shift.
// Renders from live board selection (subject), not lagging trail history.

interface PanelBodyProps {
  subject: { kind: TrailKind; id: string | null }
  /** Stable key for motion + label resolution — matches resolveChronicleView contextKey. */
  subjectKey: string
  domainId: string | null
  domainName: string
  domainSlug?: string
  boardId?: string
  onJourneySelect?: (id: string) => void
  onPathSelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
  onSessionSelect?: (id: string) => void
  onLabelResolved: (subjectKey: string, label: string) => void
  treatment: ResolvedDomainTreatment
}

function PanelBody({
  subject,
  subjectKey,
  domainId,
  domainName,
  domainSlug,
  boardId,
  onJourneySelect,
  onPathSelect,
  onMomentSelect,
  onSessionSelect,
  onLabelResolved,
  treatment,
}: PanelBodyProps) {
  const boardCtx = useUniversalBoardOptional()
  const shell = useV0ShellOptional()
  const realmArrival = useRealmArrivalOptional()
  /**
   * Chronicle Document via DomainRealmStory.
   * Named Dialogs (`user_set`) → Document. Chatter / draft-promoted shells stay
   * conversations — not an empty Document. Realm drafts open as Draft presence.
   */
  const dialogTitleSource =
    subject.kind === "dialog" && subject.id
      ? boardCtx?.selection.dialogTitleSourceById?.[subject.id]
      : undefined
  const showRealmDocument = shouldRenderRealmDocumentChronicle({
    workspaceSurface: boardCtx?.workspaceSurface ?? "dialog",
    boardId,
    subjectKind: subject.kind,
    dialogIsDocumentBearing:
      subject.kind === "dialog" &&
      isDocumentBearingDialogTitleSource(dialogTitleSource),
  })
  const objectType = TRAIL_KIND_TO_OBJECT_TYPE[subject.kind]
  const objectId = subject.kind === "domain" ? domainId : subject.id
  const layout: PresenceLayout =
    subject.kind === "glossary"
      ? boardId === "designer"
        ? "config"
        : "focus"
      : CONFIG_LAYOUT_KINDS.has(subject.kind)
        ? "config"
        : "focus"

  function renderPresence(): React.ReactNode {
    if (showRealmDocument) {
      return (
        <RealmHomeChronicle
          view={realmArrival?.chronicleView ?? "feed"}
          domainId={domainId}
          domainSlug={domainSlug}
          treatment={treatment}
          isUserHome={shell?.shellMode === "home"}
        />
      )
    }

    if (!objectId || !domainId) {
      return (
        <div className="flex h-full items-center justify-center px-4">
          <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Waiting for domain context…
          </p>
        </div>
      )
    }

    return (
      <>
        <ChronicleRecordView
          objectType={objectType}
          objectId={objectId}
          domainId={domainId}
          domainSlug={domainSlug}
          domainDisplayName={domainName}
          boardId={boardId}
          layout={layout}
          onJourneySelect={onJourneySelect}
          onPathSelect={onPathSelect}
          onMomentSelect={onMomentSelect}
          onSessionSelect={onSessionSelect}
          onKeySelect={boardCtx?.actions.onKeySelect}
          onLabelResolved={onLabelResolved}
          trailKey={subjectKey}
          treatment={treatment}
        />
        {boardId === "domain" && subject.kind === "domain" ? (
          <>
            {boardCtx?.actions.requestDialogIngest ? (
              <div className="px-4 pt-4">
                <button
                  type="button"
                  onClick={() => boardCtx.actions.requestDialogIngest()}
                  className="text-[13px] underline underline-offset-2"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  Bring in writing from outside Keeper
                </button>
                <p
                  className="text-[12px] mt-1 leading-snug"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  Starts a conversation with sections you can Gloss — not a Library upload.
                </p>
              </div>
            ) : null}
            <LibrarySharedContextRoadmapPanel />
          </>
        ) : null}
      </>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={subjectKey}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { duration: 0.2, ease: "easeOut" },
        }}
        exit={{
          opacity: 0,
          transition: { duration: 0.14, ease: "easeIn" },
        }}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {renderPresence()}
      </motion.div>
    </AnimatePresence>
  )
}

// ─── UniversalViewPanel (Chronicle) ──────────────────────────────────────────

export interface UniversalViewPanelProps {
  /** Board definition — presenceTreatment copy only; does not gate routing. */
  def: UniversalBoardDef
  domainId: string | null
  domainName: string
  domainSlug?: string

  selectedJourneyId?: string | null
  selectedMomentId?: string | null
  selectedKeeperId?: string | null
  selectedDraftId?: string | null
  selectedAgentId?: string | null
  selectedServiceSlug?: string | null

  onJourneySelect?: (id: string) => void
  onPathSelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
}

export function UniversalViewPanel({
  def,
  domainId,
  domainName,
  domainSlug,
  selectedJourneyId,
  selectedMomentId,
  selectedKeeperId,
  selectedDraftId,
  selectedAgentId,
  selectedServiceSlug,
  onJourneySelect,
  onPathSelect,
  onMomentSelect,
}: UniversalViewPanelProps) {
  const boardCtx = useUniversalBoardOptional()
  const shell = useV0ShellOptional()
  const chronicleTreatment = React.useMemo(
    () => resolveDomainTreatment(shell?.domainFrame ?? null),
    [shell?.domainFrame],
  )

  const resolved = {
    selectedDialogId: boardCtx?.selection.selectedDialogId ?? null,
    selectedJourneyId:
      selectedJourneyId ?? boardCtx?.selection.selectedJourneyId ?? null,
    selectedMomentId:
      selectedMomentId ?? boardCtx?.selection.selectedMomentId ?? null,
    selectedKeeperId:
      selectedKeeperId ?? boardCtx?.selection.selectedKeeperId ?? null,
    selectedDraftId:
      selectedDraftId ?? boardCtx?.selection.selectedDraftId ?? null,
    selectedAgentId:
      selectedAgentId ?? boardCtx?.selection.selectedAgentId ?? null,
    selectedServiceSlug:
      selectedServiceSlug ?? boardCtx?.selection.selectedServiceSlug ?? null,
  }

  const handleJourneySelect =
    onJourneySelect ?? boardCtx?.actions.onJourneySelect
  const handlePathSelect =
    onPathSelect ?? boardCtx?.actions.onPathSelect
  const handleMomentSelect =
    onMomentSelect ?? boardCtx?.actions.onMomentSelect
  const handleSessionSelect = boardCtx?.actions.onSessionSelect
  const chronicleEngagement = boardCtx?.chronicleEngagement ?? null

  // Follow the board's deferred Chronicle view (workspace paints first).
  // Fallback resolve is only for boards without UniversalBoardContext.
  const chronicleView = boardCtx?.chronicleView ?? resolveChronicleView(
    {
      selectedDialogId: resolved.selectedDialogId,
      selectedJourneyId: resolved.selectedJourneyId,
      selectedPathId: boardCtx?.selection.selectedPathId ?? null,
      selectedMomentId: resolved.selectedMomentId,
      selectedKeeperId: resolved.selectedKeeperId,
      selectedDraftId: resolved.selectedDraftId,
      selectedAgentId: resolved.selectedAgentId,
      selectedServiceSlug: resolved.selectedServiceSlug,
      selectedKeyId: boardCtx?.selection.selectedKeyId ?? null,
      selectedCapabilityId: boardCtx?.selection.selectedCapabilityId ?? null,
      selectedLibraryItemId: boardCtx?.selection.selectedLibraryItemId ?? null,
      selectedSoleMemoryId: boardCtx?.selection.selectedSoleMemoryId ?? null,
      selectedBoardDefId: boardCtx?.selection.selectedBoardDefId ?? null,
      selectedGlossaryId: boardCtx?.selection.selectedGlossaryId ?? null,
    },
    chronicleEngagement
      ? { templateSlug: chronicleEngagement.template.slug }
      : null,
  )

  const { kind, id } = chronicleSubjectToLegacyKindId(chronicleView.effective)
  const contextKey = chronicleSubjectKey(chronicleView.effective)

  const labelCache = React.useRef(new Map<string, string>())

  function resolveInitialLabel(k: TrailKind, entryId: string | null): string {
    if (k === "domain") return domainName.trim() || "···"
    return labelCache.current.get(`${k}:${entryId ?? "_"}`) ?? "···"
  }

  const [panelHistory, setPanelHistory] = React.useState<TrailEntry[]>(() => [
    {
      key: `${contextKey}:init`,
      kind,
      id,
      label: resolveInitialLabel(kind, id),
    },
  ])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [direction, setDirection] = React.useState<TrailDirection>("forward")
  const prevContextKey = React.useRef(contextKey)

  React.useEffect(() => {
    if (contextKey === prevContextKey.current) return
    prevContextKey.current = contextKey

    const newEntry: TrailEntry = {
      key: `${contextKey}:${Date.now()}`,
      kind,
      id,
      label: resolveInitialLabel(kind, id),
    }

    setPanelHistory((prev) => [...prev, newEntry])
    setCurrentIndex((prev) => prev + 1)
    setDirection("forward")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey])

  const handleLabelResolved = React.useCallback(
    (subjectKey: string, label: string) => {
      labelCache.current.set(subjectKey, label)
      setPanelHistory((prev) => {
        for (let i = prev.length - 1; i >= 0; i--) {
          const entryKey = `${prev[i].kind}:${prev[i].id ?? "_"}`
          if (entryKey !== subjectKey) continue
          return prev.map((e, idx) => (idx === i ? { ...e, label } : e))
        }
        return prev
      })
    },
    [],
  )

  const handleNavigate = React.useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(panelHistory.length - 1, index))
      setDirection(clamped < currentIndex ? "back" : "forward")
      setCurrentIndex(clamped)

      const entry = panelHistory[clamped]
      if (!entry || !boardCtx) return
      const { actions } = boardCtx

      switch (entry.kind) {
        case "dialog":
          if (entry.id) actions.onDialogSelect(entry.id)
          break
        case "journey":
          if (entry.id) actions.onJourneySelect(entry.id)
          break
        case "path":
          if (entry.id) actions.onPathSelect(entry.id)
          break
        case "moment":
          if (entry.id) actions.onMomentSelect(entry.id)
          break
        case "keeper":
          if (entry.id) actions.onKeeperSelect(entry.id)
          break
        case "draft":
          if (entry.id) {
            actions.onSoleMemorySelect(null)
            actions.onDraftSelect(entry.id)
          }
          break
        case "soleMemory":
          if (entry.id) actions.onSoleMemorySelect(entry.id)
          break
        case "agent":
          if (entry.id) actions.onAgentSelect(entry.id)
          break
        case "service":
          if (entry.id) actions.onServiceOpen(entry.id)
          break
        case "key":
          if (entry.id) actions.onKeySelect(entry.id)
          break
        case "capability":
          if (entry.id) actions.onCapabilitySelect(entry.id)
          break
        case "library":
          if (entry.id) actions.onLibraryItemSelect(entry.id)
          break
        case "glossary":
          actions.onGlossarySelect()
          break
        case "boardDef":
          if (entry.id) {
            actions.onBoardDefSelect(entry.id)
          }
          break
        case "domain":
        default:
          actions.clearSelection()
          if (def.boardId === "designer") {
            shell?.clearBoardDefinition()
          }
          break
      }
    },
    [currentIndex, panelHistory, boardCtx, def.boardId, shell],
  )

  const [feedCount, setFeedCount] = React.useState(0)

  React.useEffect(() => {
    const pollDomainId = domainId
    if (!pollDomainId) return
    let cancelled = false

    function poll() {
      type JourneyBrief = { momentCount?: number }
      const cached = getCachedBoardNavData<JourneyBrief[]>(pollDomainId!, "journeys")
      if (cached) {
        const count = cached.filter((j) => (j.momentCount ?? 0) > 0).length
        setFeedCount(count)
        return
      }
      void loadJourneyNavRows(pollDomainId!)
        .then((list) => {
          if (cancelled) return
          const count = Array.isArray(list)
            ? (list as JourneyBrief[]).filter(
                (j) => (j.momentCount ?? 0) > 0,
              ).length
            : 0
          setFeedCount(count)
        })
        .catch(() => {})
    }

    poll()
    const interval = setInterval(poll, 120_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [domainId])

  const handleFeedClick = React.useCallback(() => {
    const domainIndex = panelHistory.findIndex((e) => e.kind === "domain")
    if (domainIndex >= 0) {
      handleNavigate(domainIndex)
      return
    }
    boardCtx?.actions.clearSelection()
  }, [panelHistory, handleNavigate, boardCtx])

  const liveSubject = { kind, id }

  const isFocused = liveSubject.kind !== "domain" || liveSubject.id != null

  return (
    <div
      className={`keeper-chronicle-panel flex flex-col h-full min-h-0 overflow-hidden${
        isFocused ? " keeper-chronicle-panel--focused" : ""
      }`}
      style={{
        color: "hsl(var(--theme-ink-primary))",
      }}
    >
      <TrailBar
        entries={panelHistory}
        currentIndex={currentIndex}
        onNavigate={handleNavigate}
        feedCount={feedCount}
        direction={direction}
        onFeedClick={handleFeedClick}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {chronicleEngagement ? (
          <ChronicleEngagementSurface
            intent={chronicleEngagement}
            onClose={() => boardCtx?.actions.closeChronicleEngagement()}
          />
        ) : boardCtx?.composerReachOpen && domainId ? (
          <ReachChroniclePresence
            domainId={domainId}
            onClose={() => boardCtx.actions.closeComposerReach()}
          />
        ) : boardCtx?.composerThemeOpen ? (
          <ThemeChroniclePresence
            onClose={() => boardCtx.actions.closeComposerTheme()}
          />
        ) : boardCtx?.dialogIngest ? (
          domainId ? (
            <DialogIngestPresence
              domainId={domainId}
              dialogId={boardCtx.dialogIngest.dialogId}
              dialogTitle={boardCtx.dialogIngest.dialogTitle}
              onClose={() => boardCtx.actions.closeDialogIngest()}
            />
          ) : (
            <PanelBody
              subject={liveSubject}
              subjectKey={contextKey}
              domainId={domainId}
              domainName={domainName}
              domainSlug={domainSlug}
              boardId={def.boardId}
              onJourneySelect={handleJourneySelect}
              onPathSelect={handlePathSelect}
              onMomentSelect={handleMomentSelect}
              onSessionSelect={handleSessionSelect}
              onLabelResolved={handleLabelResolved}
              treatment={chronicleTreatment}
            />
          )
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {boardCtx?.workspaceSurface === "stage" ? (
              <OnStageObjectList layout="chronicle" />
            ) : null}
            <div className="min-h-0 flex-1 overflow-hidden">
              <PanelBody
                subject={liveSubject}
                subjectKey={contextKey}
                domainId={domainId}
                domainName={domainName}
                domainSlug={domainSlug}
                boardId={def.boardId}
                onJourneySelect={handleJourneySelect}
                onPathSelect={handlePathSelect}
                onMomentSelect={handleMomentSelect}
                onSessionSelect={handleSessionSelect}
                onLabelResolved={handleLabelResolved}
                treatment={chronicleTreatment}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
