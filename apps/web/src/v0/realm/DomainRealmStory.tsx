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
  resolveDocumentForward,
} from "@keeper/shared"
import {
  DocumentShell,
  type DocumentGlossThreadInfo,
} from "../presence/chronicleDocument/DocumentShell"
import { DocumentHeader } from "../presence/chronicleDocument/DocumentHeader"
import {
  DOCUMENT_EMPTY_POINTS_COPY,
  DOCUMENT_LOADING_COPY,
  DOCUMENT_SELECT_DIALOG_COPY,
  resolveDocumentHeaderTitle,
} from "../presence/chronicleDocument/documentHeader"
import { useDocumentAuthoring } from "../presence/chronicleDocument/useDocumentAuthoring"
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
import { useDraftPointAccept } from "../../hooks/useDraftPointAccept"
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
  title?: string
  status?: string
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
 * DraftPoints into Document cards. Every named Dialog resolves a Forward.
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
  const draftPresenceRevision = boardCtx?.selection.draftPresenceRevision ?? 0
  const chronicleDialogId =
    boardCtx?.chronicleView.effective.kind === "dialog"
      ? boardCtx.chronicleView.effective.id
      : null

  const scope = React.useMemo((): DialogDocumentScope => {
    // Follow Chronicle after workspace — do not fetch the Document from live Nav.
    if (chronicleDialogId) {
      return { status: "dialog", dialogId: chronicleDialogId }
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
    chronicleDialogId,
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

  React.useEffect(() => {
    if (!draftPresenceRevision) return
    refreshDocumentAfterMutation()
  }, [draftPresenceRevision, refreshDocumentAfterMutation])

  const [acceptError, setAcceptError] = React.useState<string | null>(null)
  const handlePointAccepted = React.useCallback(() => {
    refreshDocumentAfterMutation()
  }, [refreshDocumentAfterMutation])
  const {
    acceptedDraftPointIds,
    acceptingDraftPointId,
    acceptDraftPoint,
  } = useDraftPointAccept({
    domainId,
    // Stay on Document — do not switch Nav to the manuscript draft.
    bumpDraftPresence: boardCtx?.actions.bumpDraftPresence,
    bumpDraftNav: boardCtx?.actions.bumpDraftNav,
    onAccepted: handlePointAccepted,
    setError: setAcceptError,
  })

  React.useEffect(() => {
    setAcceptError(null)
  }, [scope])

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
          ...(document.title?.trim() ? { title: document.title.trim() } : {}),
          ...(document.status?.trim() ? { status: document.status.trim() } : {}),
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

  const documentComponents = React.useMemo(() => {
    if (scope.status !== "dialog") return [] as DialogDocumentMeta["components"]
    const registered = documentMeta.components
    const group = byDialog.find((row) => row.dialogId === scope.dialogId)
    const linked = (group?.byStage.drafts ?? []).map((entry) => ({
      draftId: entry.id,
      title: entry.label,
      kind: entry.description?.trim() || "draft",
      status: entry.point.status?.label || "active",
      summary: entry.point.lede ?? null,
      label: entry.label,
    }))
    const seen = new Set(registered.map((row) => row.draftId))
    return [...registered, ...linked.filter((row) => !seen.has(row.draftId))]
  }, [scope, documentMeta.components, byDialog])

  const handleOpenComponentDraft = React.useCallback(
    (draftId: string) => {
      boardCtx?.actions.onDraftSelect(draftId, {
        dialogId: scope.status === "dialog" ? scope.dialogId : null,
      })
    },
    [boardCtx, scope],
  )

  const dialogNavTitle =
    scope.status === "dialog" && scope.dialogId
      ? byDialog.find((group) => group.dialogId === scope.dialogId)?.title
      : undefined
  const documentTitle = resolveDocumentHeaderTitle({
    dialogTitle: documentMeta.title,
    forwardTitle: documentMeta.forward?.title,
    navTitle: dialogNavTitle,
  })
  const resolvedForward =
    scope.status === "dialog"
      ? resolveDocumentForward({
          forwardTitle: documentMeta.forward?.title,
          forwardDescription: documentMeta.forward?.description,
          dialogTitle: documentTitle,
          imageUrl: documentMeta.forward?.imageUrl,
        })
      : undefined
  const storyPointIds = storyEntries.map((entry) => entry.id)
  const authoring = useDocumentAuthoring({
    domainId,
    dialogId: scope.status === "dialog" ? scope.dialogId : null,
    title: documentTitle,
    status: documentMeta.status,
    forwardTitle: documentMeta.forward?.title ?? "",
    forwardDescription: documentMeta.forward?.description ?? "",
    paths: documentMeta.paths,
    pointIds: storyPointIds,
    onRefresh: refreshDocumentAfterMutation,
  })

  const emptyState = (
    <div className="px-4 py-6">
      {scope.status === "none" ? (
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {loading ? DOCUMENT_LOADING_COPY : DOCUMENT_SELECT_DIALOG_COPY}
        </p>
      ) : (loading || documentLoading) && storyEntries.length === 0 ? (
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {DOCUMENT_LOADING_COPY}
        </p>
      ) : (
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {DOCUMENT_EMPTY_POINTS_COPY}
        </p>
      )}
    </div>
  )

  const ingestControl =
    scope.status === "dialog" && scope.dialogId ? (
      <button
        type="button"
        onClick={() =>
          boardCtx?.actions.requestDialogIngest({
            dialogId: scope.dialogId,
            dialogTitle: documentTitle,
          })
        }
        className="cdraft-breadcrumb-link text-[13px]"
      >
        Add writing from outside Keeper
      </button>
    ) : null

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
        forward={resolvedForward}
        step={scope.status === "dialog" ? documentMeta.step : undefined}
        authoring={
          scope.status === "dialog"
            ? {
                enabled: authoring.editing,
                busy: authoring.busy,
                error: authoring.error,
                sections: documentMeta.paths.map((path) => ({
                  id: path.id,
                  title: path.title,
                })),
                onSaveForward: authoring.saveForward,
                onAddSection: authoring.addSection,
                onRenameSection: authoring.renameSection,
                onDeleteSection: authoring.deleteSection,
                onMoveSection: authoring.moveSection,
                onAddPoint: authoring.addPoint,
                onUpdatePoint: authoring.updatePoint,
                onDeletePoint: authoring.deletePoint,
                onMovePoint: authoring.movePoint,
              }
            : undefined
        }
        paths={paths}
        points={points}
        pointIds={storyPointIds}
        components={
          scope.status === "dialog" && documentComponents.length > 0
            ? documentComponents
            : undefined
        }
        onOpenComponentDraft={
          scope.status === "dialog" ? handleOpenComponentDraft : undefined
        }
        onGlossPoint={handleGlossPoint}
        onAcceptPoint={
          scope.status === "dialog" ? acceptDraftPoint : undefined
        }
        acceptingPointId={acceptingDraftPointId}
        acceptedPointIds={acceptedDraftPointIds}
        acceptError={acceptError}
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
        <DocumentHeader
          title={documentTitle}
          status={documentMeta.status}
          pointCount={points.length}
          componentCount={documentComponents.length}
          editing={authoring.editing}
          onToggleEdit={domainId ? authoring.toggleEdit : undefined}
          onTitleCommit={authoring.saveTitle}
          onCycleStatus={authoring.cycleStatus}
          onFocusSections={() => {
            document.getElementById("document-linked-sections")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }}
          documentControl={ingestControl}
        />
      ) : null}
      {scope.status === "dialog" ? (
        <div
          className="flex shrink-0 gap-4 px-4 pt-3"
          role="tablist"
          aria-label="Chronicle view"
          style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.25)" }}
        >
          {(["document", "history"] as const).map((mode) => {
            const selected = panelMode === mode
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => boardCtx?.actions.setChroniclePanelMode(mode)}
                className="pb-2 text-[12px] font-semibold capitalize"
                style={{
                  color: selected
                    ? "hsl(var(--theme-ink-primary))"
                    : "hsl(var(--theme-ink-tertiary))",
                  borderBottom: selected
                    ? "2px solid hsl(var(--theme-ink-primary) / 0.7)"
                    : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {mode}
              </button>
            )
          })}
        </div>
      ) : null}
      {body}
    </ChronicleTreatmentShell>
  )
}
