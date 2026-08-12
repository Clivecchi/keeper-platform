"use client"

import * as React from "react"
import type {
  DocumentForward,
  DocumentPathDeclaration,
  DocumentStep,
} from "@keeper/shared"
import {
  buildGlossThreadKey,
  parseDocumentPathDeclarations,
  parseGlossThreads,
  resolveChroniclePanelBody,
} from "@keeper/shared"
import {
  DocumentShell,
  type DocumentGlossThreadInfo,
} from "../presence/chronicleDocument/DocumentShell"
import { ChronicleTreatmentShell } from "../treatment/ChronicleTreatmentShell"
import type { ResolvedDomainTreatment } from "../treatment/resolveDomainTreatment"
import { useRealmNavGrowth } from "./useRealmNavGrowth"
import {
  buildDocumentPaths,
  manuscriptPointsToRealmNavEntries,
  type RealmNavEntry,
} from "./realmNavGrowth"
import {
  invalidateDialogDocument,
  loadDialogDocumentCached,
} from "./dialogDocumentCache"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { KipApi } from "../../lib/kipApi"
import { ChronicleHistoryPanel } from "../presence/chronicleDocument/ChronicleHistoryPanel"

export interface DomainRealmStoryProps {
  domainId: string | null
  domainSlug: string
  treatment: ResolvedDomainTreatment
  /** User-scoped cross-domain feed — when on `/home`. */
  userFeedContent?: React.ReactNode
}

type DialogDocumentScope =
  | { status: "none" }
  | { status: "dialog"; dialogId: string | null }

type DialogDocumentMeta = {
  forward?: DocumentForward
  step?: DocumentStep
  paths: DocumentPathDeclaration[]
  components: Array<{
    draftId: string
    title: string
    kind: string
    status: string
    summary?: string | null
    order?: number
    label?: string
  }>
}

function entryMatchesSelection(
  entry: RealmNavEntry,
  selectedDraftId: string | null | undefined,
  selectedMomentId: string | null | undefined,
  selectedLibraryItemId: string | null | undefined,
): boolean {
  if (entry.kind === "draft" && selectedDraftId && entry.id === selectedDraftId) return true
  if (entry.kind === "moment" && selectedMomentId && entry.id === selectedMomentId) return true
  if (entry.kind === "library" && selectedLibraryItemId && entry.id === selectedLibraryItemId) {
    return true
  }
  return false
}

/**
 * Domain-scoped Realm Chronicle — thin adapter over DocumentShell.
 * Loads Dialog Document via one `/document` round-trip; expands manuscript
 * DraftPoints into Document cards. No hardcoded placeholder Forward/Step.
 */
export function DomainRealmStory({
  domainId,
  domainSlug,
  treatment,
  userFeedContent,
}: DomainRealmStoryProps) {
  const boardCtx = useUniversalBoardOptional()
  const { loading, byDialog } = useRealmNavGrowth(domainId, domainSlug, !!domainId)

  const selectedDialogId = boardCtx?.selection.selectedDialogId ?? null
  const selectedDraftId = boardCtx?.selection.selectedDraftId ?? null
  const selectedMomentId = boardCtx?.selection.selectedMomentId ?? null
  const selectedLibraryItemId = boardCtx?.selection.selectedLibraryItemId ?? null
  const panelMode = boardCtx?.selection.chroniclePanelMode ?? "document"
  const pointTarget = boardCtx?.selection.chroniclePointTarget

  const scope = React.useMemo((): DialogDocumentScope => {
    if (selectedDialogId) {
      return { status: "dialog", dialogId: selectedDialogId }
    }

    if (!selectedDraftId && !selectedMomentId && !selectedLibraryItemId) {
      return { status: "none" }
    }

    for (const group of byDialog) {
      const entries = [
        ...group.byStage.kept,
        ...group.byStage.drafts,
        ...group.byStage.presented,
      ]
      if (
        entries.some((entry) =>
          entryMatchesSelection(
            entry,
            selectedDraftId,
            selectedMomentId,
            selectedLibraryItemId,
          ),
        )
      ) {
        return { status: "dialog", dialogId: group.dialogId }
      }
    }

    // Selection exists but lineage not yet resolvable — wait rather than flatten.
    return { status: "none" }
  }, [
    byDialog,
    selectedDialogId,
    selectedDraftId,
    selectedMomentId,
    selectedLibraryItemId,
  ])

  const [documentMeta, setDocumentMeta] = React.useState<DialogDocumentMeta>({
    paths: [],
    components: [],
  })
  const [manuscriptEntries, setManuscriptEntries] = React.useState<RealmNavEntry[]>([])
  const [documentLoading, setDocumentLoading] = React.useState(false)
  /** Bumps when Document Gloss rewrites a Point so Chronicle reloads past cache. */
  const [documentEpoch, setDocumentEpoch] = React.useState(0)
  const [glossThreadsByKey, setGlossThreadsByKey] = React.useState<
    ReadonlyMap<string, DocumentGlossThreadInfo>
  >(() => new Map())

  const refreshDocumentAfterMutation = React.useCallback(() => {
    if (!domainId || scope.status !== "dialog" || !scope.dialogId) return
    invalidateDialogDocument(domainId, scope.dialogId)
    setDocumentEpoch((n) => n + 1)
  }, [domainId, scope])

  const [glossEpoch, setGlossEpoch] = React.useState(0)
  const refreshGlossActivity = React.useCallback(() => {
    setGlossEpoch((n) => n + 1)
  }, [])

  /** Prefetch Dialog Gloss carrier so Points can show Glossed badges without opening Gloss. */
  React.useEffect(() => {
    if (scope.status !== "dialog" || !scope.dialogId || !domainId) {
      setGlossThreadsByKey(new Map())
      return
    }
    let cancelled = false
    const dialogId = scope.dialogId
    void (async () => {
      try {
        const kip = await KipApi.getAgentBySlug("kip")
        const carrier = await KipApi.ensureDialogGlossCarrier(domainId, dialogId, {
          agentId: kip.id,
        })
        if (cancelled) return
        const threads = parseGlossThreads(carrier.glossThreads)
        const map = new Map<string, DocumentGlossThreadInfo>()
        for (const thread of threads) {
          const count = thread.messages?.length ?? 0
          if (count <= 0) continue
          map.set(buildGlossThreadKey(thread.anchor), { messageCount: count })
        }
        setGlossThreadsByKey(map)
      } catch {
        if (!cancelled) setGlossThreadsByKey(new Map())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [domainId, scope, documentEpoch, glossEpoch])

  React.useEffect(() => {
    if (scope.status !== "dialog" || !scope.dialogId || !domainId) {
      setDocumentMeta({ paths: [], components: [] })
      setManuscriptEntries([])
      setDocumentLoading(false)
      return
    }

    let cancelled = false
    const dialogId = scope.dialogId
    setDocumentLoading(true)

    void (async () => {
      try {
        const document = await loadDialogDocumentCached(domainId, dialogId, () =>
          KipApi.getDialogDocument(domainId, dialogId),
        )
        if (cancelled) return

        const meta: DialogDocumentMeta = {
          ...(document.forward ? { forward: document.forward } : {}),
          ...(document.step ? { step: document.step } : {}),
          paths: parseDocumentPathDeclarations(document.paths),
          components: Array.isArray(document.components) ? document.components : [],
        }
        setDocumentMeta(meta)

        const pathTitles = new Map(
          meta.paths.map((path) => [path.id, path.title] as const),
        )
        const expanded = document.manuscripts.flatMap((manuscript) =>
          manuscriptPointsToRealmNavEntries(manuscript, dialogId, pathTitles),
        )
        setManuscriptEntries(expanded)
      } catch {
        if (!cancelled) {
          setDocumentMeta({ paths: [], components: [] })
          setManuscriptEntries([])
        }
      } finally {
        if (!cancelled) setDocumentLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [domainId, scope, documentEpoch])

  // Document Points are manuscript Points (+ non-draft kept/presented). Never render
  // ordinary drafts as faux Point cards — those belong in Document drafts only.
  const legacyEntries = React.useMemo(() => {
    if (scope.status !== "dialog") return [] as RealmNavEntry[]
    const group = byDialog.find((row) => row.dialogId === scope.dialogId)
    if (!group) return []
    return [
      ...group.byStage.kept,
      ...group.byStage.drafts,
      ...group.byStage.presented,
    ].filter((entry) => entry.kind !== "draft")
  }, [byDialog, scope])

  const storyEntries = React.useMemo(() => {
    if (manuscriptEntries.length > 0) {
      return [...manuscriptEntries, ...legacyEntries]
    }
    return legacyEntries
  }, [manuscriptEntries, legacyEntries])

  const points = React.useMemo(
    () => storyEntries.map((entry) => entry.point),
    [storyEntries],
  )

  const paths = React.useMemo(
    () => buildDocumentPaths(documentMeta.paths, storyEntries),
    [documentMeta.paths, storyEntries],
  )

  const handleGlossPoint = React.useCallback(
    (_point: RealmNavEntry["point"], index: number) => {
      // Fallback when inline Document Gloss is unavailable (no dialog scope).
      const entry = storyEntries[index]
      const anchor = entry?.point.gloss?.anchor
      if (!anchor || !entry) return
      boardCtx?.actions.requestDiscussDraftPoint(anchor, {
        glossContent: entry.point.gloss?.snapshot,
        dialogId: entry.dialogId ?? selectedDialogId,
      })
    },
    [boardCtx, storyEntries, selectedDialogId],
  )

  const handleOpenComponentDraft = React.useCallback(
    (draftId: string) => {
      boardCtx?.actions.onDraftSelect(draftId)
    },
    [boardCtx],
  )

  const emptyState = (
    <div className="px-4 py-6">
      {scope.status === "none" ? (
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {loading
            ? "Loading story…"
            : "Select a Dialog to see its Document"}
        </p>
      ) : (loading || documentLoading) && storyEntries.length === 0 ? (
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Loading story…
        </p>
      ) : (
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Realm is breathing. What you shape, keep, and show will accumulate here.
        </p>
      )}
    </div>
  )

  // When a Dialog is active, Document/History own the body — never the Realm
  // arrival feed. Passing userFeedContent on /home used to short-circuit both tabs
  // into the same flat list (the bug that made Document === History).
  const bodyKind = resolveChroniclePanelBody({
    dialogActive: scope.status === "dialog",
    panelMode,
    hasUserFeedContent: Boolean(userFeedContent),
  })
  const body =
    bodyKind === "history" && scope.status === "dialog" ? (
      <ChronicleHistoryPanel
        domainId={domainId}
        dialogId={scope.dialogId}
        onOpenDocument={(event) => {
          boardCtx?.actions.openChronicleDocument({
            dialogId: event.dialogId,
            pointId: event.anchor?.pointId ?? null,
            breadcrumb: event.anchor?.breadcrumb ?? null,
          })
        }}
      />
    ) : bodyKind === "userFeed" ? (
      <div className="domain-realm-story flex min-h-0 flex-1 flex-col overflow-y-auto">
        {userFeedContent}
      </div>
    ) : (
      <DocumentShell
        className="domain-realm-story"
        forward={scope.status === "dialog" ? documentMeta.forward : undefined}
        step={scope.status === "dialog" ? documentMeta.step : undefined}
        paths={paths}
        points={points}
        pointIds={storyEntries.map((entry) => entry.id)}
        components={
          scope.status === "dialog" && documentMeta.components.length > 0
            ? documentMeta.components
            : undefined
        }
        onOpenComponentDraft={
          scope.status === "dialog" ? handleOpenComponentDraft : undefined
        }
        onGlossPoint={handleGlossPoint}
        glossContext={
          domainId && scope.status === "dialog" && scope.dialogId
            ? {
                domainId,
                domainSlug,
                dialogId: scope.dialogId,
                onPointMutated: refreshDocumentAfterMutation,
                onGlossActivity: refreshGlossActivity,
                glossThreadsByKey,
              }
            : null
        }
        scrollToPointId={pointTarget?.pointId}
        breadcrumb={pointTarget?.breadcrumb}
        emptyState={emptyState}
      />
    )

  return (
    <ChronicleTreatmentShell treatment={treatment}>
      {scope.status === "dialog" ? (
        <div className="flex shrink-0 gap-1 px-4 pt-3" role="tablist" aria-label="Chronicle view">
          {(["document", "history"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={panelMode === mode}
              onClick={() => boardCtx?.actions.setChroniclePanelMode(mode)}
              className="rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize"
              style={{
                color: panelMode === mode ? "hsl(var(--theme-ink-primary))" : "hsl(var(--theme-ink-tertiary))",
                background: panelMode === mode ? "hsl(var(--theme-surface-elevated))" : "transparent",
                border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      ) : null}
      {body}
    </ChronicleTreatmentShell>
  )
}
