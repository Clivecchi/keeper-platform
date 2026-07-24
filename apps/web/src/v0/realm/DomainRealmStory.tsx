"use client"

import * as React from "react"
import type {
  DocumentForward,
  DocumentPathDeclaration,
  DocumentStep,
} from "@keeper/shared"
import { parseDocumentPathDeclarations } from "@keeper/shared"
import { DocumentShell } from "../presence/chronicleDocument/DocumentShell"
import { ChronicleTreatmentShell } from "../treatment/ChronicleTreatmentShell"
import type { ResolvedDomainTreatment } from "../treatment/resolveDomainTreatment"
import { useRealmNavGrowth } from "./useRealmNavGrowth"
import {
  buildDocumentPaths,
  DOCUMENT_MANUSCRIPT_KIND,
  manuscriptPointsToRealmNavEntries,
  type RealmNavEntry,
} from "./realmNavGrowth"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { apiFetch } from "../../lib/apiFetch"
import { KipApi, type KipDraft } from "../../lib/kipApi"

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

function readDialogDocumentMeta(raw: unknown): DialogDocumentMeta {
  if (!raw || typeof raw !== "object") return { paths: [] }
  const dialog = raw as Record<string, unknown>
  const forwardTitle =
    typeof dialog.forward_title === "string" ? dialog.forward_title.trim() : ""
  const forwardDescription =
    typeof dialog.forward_description === "string"
      ? dialog.forward_description.trim()
      : ""
  const stepTitle = typeof dialog.step_title === "string" ? dialog.step_title.trim() : ""
  const stepBody = typeof dialog.step_body === "string" ? dialog.step_body.trim() : ""
  return {
    ...(forwardTitle && forwardDescription
      ? { forward: { title: forwardTitle, description: forwardDescription } }
      : {}),
    ...(stepTitle && stepBody ? { step: { title: stepTitle, body: stepBody } } : {}),
    paths: parseDocumentPathDeclarations(dialog.document_paths),
  }
}

/**
 * Domain-scoped Realm Chronicle — thin adapter over DocumentShell.
 * Loads Dialog Forward/Step/Paths from the Dialog itself; expands manuscript
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

  const [documentMeta, setDocumentMeta] = React.useState<DialogDocumentMeta>({ paths: [] })
  const [manuscriptEntries, setManuscriptEntries] = React.useState<RealmNavEntry[]>([])
  const [documentLoading, setDocumentLoading] = React.useState(false)

  React.useEffect(() => {
    if (scope.status !== "dialog" || !scope.dialogId || !domainId) {
      setDocumentMeta({ paths: [] })
      setManuscriptEntries([])
      setDocumentLoading(false)
      return
    }

    let cancelled = false
    const dialogId = scope.dialogId
    setDocumentLoading(true)

    void (async () => {
      try {
        const [dialogRes, drafts] = await Promise.all([
          apiFetch(
            `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(dialogId)}`,
          ),
          KipApi.listDrafts(domainId, undefined, {
            limit: 40,
            excludeStatus: ["promoted", "archived"],
          }).catch(() => [] as Awaited<ReturnType<typeof KipApi.listDrafts>>),
        ])

        if (cancelled) return

        const dialogPayload = (dialogRes as { dialog?: unknown })?.dialog
        const meta = readDialogDocumentMeta(dialogPayload)
        setDocumentMeta(meta)

        const pathTitles = new Map(
          meta.paths.map((path) => [path.id, path.title] as const),
        )

        const manuscriptSummaries = drafts.filter((draft) => {
          const row = draft as { dialogId?: string | null; dialog_id?: string | null; kind?: string }
          const draftDialogId = row.dialogId ?? row.dialog_id
          return (
            draftDialogId === dialogId
            && (row.kind === DOCUMENT_MANUSCRIPT_KIND
              || (Array.isArray(draft.pointIds) && draft.pointIds.length > 0
                && draft.title?.toLowerCase().includes("becoming together")))
          )
        })

        const expanded: RealmNavEntry[] = []
        for (const summary of manuscriptSummaries) {
          const detail = await KipApi.getDraft(domainId, summary.id).catch(() => null)
          if (!detail || cancelled) continue
          expanded.push(
            ...manuscriptPointsToRealmNavEntries(detail as KipDraft, dialogId, pathTitles),
          )
        }
        if (!cancelled) setManuscriptEntries(expanded)
      } catch {
        if (!cancelled) {
          setDocumentMeta({ paths: [] })
          setManuscriptEntries([])
        }
      } finally {
        if (!cancelled) setDocumentLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [domainId, scope])

  const legacyEntries = React.useMemo(() => {
    if (scope.status !== "dialog") return [] as RealmNavEntry[]
    const group = byDialog.find((row) => row.dialogId === scope.dialogId)
    if (!group) return []
    return [
      ...group.byStage.kept,
      ...group.byStage.drafts,
      ...group.byStage.presented,
    ].filter((entry) => {
      // Manuscript wrapper draft is represented by its expanded Points, not the draft card.
      if (entry.kind !== "draft") return true
      return entry.description !== DOCUMENT_MANUSCRIPT_KIND
        && !entry.label.toLowerCase().includes("becoming together · manuscript")
    })
  }, [byDialog, scope])

  const storyEntries = React.useMemo(() => {
    if (manuscriptEntries.length > 0) {
      // Prefer manuscript Points; keep non-draft kept/presented alongside.
      const extras = legacyEntries.filter((entry) => entry.kind !== "draft")
      return [...manuscriptEntries, ...extras]
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
      const entry = storyEntries[index]
      const anchor = entry?.point.gloss?.anchor
      if (!anchor || !entry) return
      boardCtx?.actions.requestDiscussDraftPoint(anchor, {
        glossContent: entry.point.gloss?.snapshot,
      })
    },
    [boardCtx, storyEntries],
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

  const body = userFeedContent ? (
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
      onGlossPoint={handleGlossPoint}
      emptyState={emptyState}
    />
  )

  return <ChronicleTreatmentShell treatment={treatment}>{body}</ChronicleTreatmentShell>
}
