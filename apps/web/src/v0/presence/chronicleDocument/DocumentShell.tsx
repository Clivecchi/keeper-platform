"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import type {
  DocumentComponentDraft,
  DocumentForward,
  DocumentPathGroup,
  DocumentSectionWeight,
  DocumentStep,
  Point,
  PointProposalMark,
} from "@keeper/shared"
import {
  buildGlossThreadKey,
  DOCUMENT_OPEN_SECTION,
  reorganizeChangeLabel,
  resolveDocumentForward,
  resolveSectionChangeCues,
  resolveSectionIntro,
  type SectionChangeCue,
} from "@keeper/shared"
import { PointView, type PointAuthoringProps } from "./PointView"
import { DocumentPointGloss } from "./DocumentPointGloss"
import { scrollToChroniclePoint } from "./chronicleMobile"
import {
  AddNamedEditor,
  AddPointEditor,
  AuthorSaveBar,
  AutoGrowTextarea,
  splitDisplayedPointForEdit,
} from "./ChronicleAuthorControls"

export type DocumentAuthoringSurface = {
  enabled: boolean
  busy?: boolean
  error?: string | null
  sections: Array<{ id: string; title: string }>
  onSaveForward: (title: string, description: string) => void
  onAddSection: (title: string) => void
  onRenameSection: (sectionId: string, title: string) => void
  onDeleteSection: (sectionId: string) => void
  onMoveSection: (sectionId: string, direction: "up" | "down") => void
  onAddPoint: (sectionId: string | null, title: string, body: string) => void
  onUpdatePoint: (
    pointId: string,
    patch: { title?: string; content?: string; sectionId?: string | null },
  ) => void
  onDeletePoint: (pointId: string) => void
  onMovePoint: (sectionPointIds: string[], pointId: string, direction: "up" | "down") => void
}

/** Per-Point Gloss activity for Chronicle badges (carrier threads keyed by anchor). */
export type DocumentGlossThreadInfo = {
  messageCount: number
}

export type DocumentGlossContext = {
  domainId: string
  domainSlug: string
  dialogId: string
  /** After a successful Point rewrite — invalidate Chronicle Document cache + reload. */
  onPointMutated?: () => void
  /** After any Gloss turn — refresh Glossed badges without requiring rewrite. */
  onGlossActivity?: () => void
  /** buildGlossThreadKey → thread info (presence of messages). */
  glossThreadsByKey?: ReadonlyMap<string, DocumentGlossThreadInfo>
}

export interface DocumentShellProps {
  /** Optional cover slot above the Point sequence (board-supplied). */
  cover?: React.ReactNode
  /**
   * @deprecated Prefer `forward`. When `forward` is omitted, title/subtitle
   * map into the Forward block so existing callers keep working.
   */
  title?: string
  subtitle?: string
  /**
   * Directional objective of the Dialog — not the Document identity header.
   * Named Dialog Documents render `DocumentHeader` (Cdraft pattern) outside this shell.
   * Every named Document should pass a resolved Forward.
   */
  forward?: DocumentForward
  /** Inline authoring — pencil on the Document title, not a Manage form. */
  authoring?: DocumentAuthoringSurface
  /** Live tip of the lineage; always visible when set, regardless of Forward collapse. */
  step?: DocumentStep
  /**
   * Optional Path groups. `pointIds` are indexes into `points` (as decimal strings).
   * When omitted or empty, Points render as a single flat sequence.
   */
  paths?: DocumentPathGroup[]
  points: Point[]
  /** Durable IDs parallel to points (Point is intentionally presentation-only). */
  pointIds?: Array<string | null | undefined>
  /**
   * Non-manuscript drafts registered as Document components
   * (Dialog.document_components — not Point storage).
   */
  components?: DocumentComponentDraft[]
  /** Open a registered Document component draft in Chronicle. */
  onOpenComponentDraft?: (draftId: string) => void
  onGlossPoint?: (point: Point, index: number) => void
  /**
   * Human Accept for manuscript Points — same `draft.point.accept` API as Cdraft.
   * Draft/point ids come from `point.gloss.anchor` (entityId / nodeId).
   */
  onAcceptPoint?: (draftId: string, pointId: string) => void
  acceptingPointId?: string | null
  acceptedPointIds?: ReadonlySet<string>
  /** Accept / Document action errors (human Chronicle control). */
  acceptError?: string | null
  /**
   * When set, Point Gloss opens an inline polish panel on the Point (Document Gloss).
   * Prefer this over Dialog-only discuss for Chronicle polish.
   */
  glossContext?: DocumentGlossContext | null
  /** Durable DraftPoint id to reveal after a Chronicle deep-link. */
  scrollToPointId?: string | null
  /** Optional context shown while the document is focused through a deep-link. */
  breadcrumb?: string[] | null
  emptyState?: React.ReactNode
  onBringInWriting?: () => void
  className?: string
  /** In-place Review & Reorganize marks (Proposed / Changes). */
  proposalMarks?: Record<string, PointProposalMark>
  /**
   * Live cue in the Forward slot (uploads, etc.). Click opens inspect overlay
   * over Workspace — does not replace the Document.
   */
  now?: {
    name: string
    previewUrl?: string | null
    onOpen?: () => void
  } | null
}

function isPointAccepted(
  point: Point,
  pointId: string | undefined,
  acceptedPointIds?: ReadonlySet<string>,
): boolean {
  if (pointId && acceptedPointIds?.has(pointId)) return true
  const label = point.status?.label?.trim().toLowerCase() ?? ""
  return label === "accepted"
}

function resolveAcceptTarget(point: Point, pointId?: string): {
  draftId: string
  pointId: string
} | null {
  const anchor = point.gloss?.anchor
  if (!anchor || anchor.entityKind !== "draft") return null
  const draftId = anchor.entityId?.trim()
  const nodeId = anchor.nodeId?.trim() || pointId?.trim()
  if (!draftId || !nodeId) return null
  return { draftId, pointId: nodeId }
}

function sectionAccentColor(weight: DocumentSectionWeight): string {
  if (weight === "open") return "hsl(var(--theme-ink-tertiary))"
  return "hsl(var(--theme-accent-primary))"
}

function sectionCueLabel(cue: SectionChangeCue): string {
  const label = reorganizeChangeLabel(cue.kind)
  if (!label) return `${cue.count}`
  return cue.count === 1 ? label : `${cue.count} ${label}`
}

function SectionHeader({
  title,
  prelude,
  intro,
  imageUrl,
  count,
  cues,
  weight,
  expanded,
  onToggle,
}: {
  title?: string
  prelude?: string
  /** Derived spine when there is no authored prelude. Shown while collapsed. */
  intro?: string | null
  imageUrl?: string
  count: number
  cues?: SectionChangeCue[]
  weight: DocumentSectionWeight
  expanded: boolean
  onToggle: () => void
}) {
  if (!title && !prelude && !intro && !imageUrl && count === 0) return null
  const accentColor = sectionAccentColor(weight)
  const collapsedIntro = !expanded ? (prelude?.trim() || intro?.trim() || null) : null
  const expandedPrelude = expanded ? prelude?.trim() || null : null
  return (
    <header className="document-shell-path__header px-1 pb-2 pt-1">
      {imageUrl?.trim() ? (
        <div
          className="mb-2.5 overflow-hidden rounded-lg"
          style={{
            aspectRatio: "21 / 9",
            background: `linear-gradient(180deg, hsl(var(--theme-ink-primary) / 0.15), hsl(var(--theme-surface-paper) / 0.9)), url(${JSON.stringify(imageUrl.trim())}) center/cover no-repeat`,
            border: "1px solid hsl(var(--theme-border-soft) / 0.35)",
          }}
          role="img"
          aria-label={title ? `${title} section image` : "Section image"}
        />
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-baseline justify-between gap-3 text-left"
        aria-expanded={expanded}
        aria-label={
          title
            ? `${expanded ? "Collapse" : "Expand"} ${title} (${count} points)`
            : expanded
              ? "Collapse section"
              : "Expand section"
        }
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
            strokeWidth={2}
            style={{ color: accentColor }}
            aria-hidden
          />
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: accentColor }}
            aria-hidden
          />
          {title ? (
            <h3
              className="truncate text-[18px] font-semibold tracking-[0.02em]"
              style={{
                color: accentColor,
                fontFamily: "var(--theme-font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              {title}
            </h3>
          ) : null}
        </div>
        <div className="flex shrink-0 items-baseline gap-2">
          {count > 0 ? (
            <span
              className="text-[13px] font-medium tabular-nums"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              aria-label={`${count} points`}
            >
              {count} {count === 1 ? "Point" : "Points"}
            </span>
          ) : null}
        </div>
      </button>
      {cues && cues.length > 0 ? (
        <p
          className="mt-1 pl-7 text-[12px] font-medium"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {cues.map((cue) => sectionCueLabel(cue)).join(" · ")}
        </p>
      ) : null}
      {collapsedIntro ? (
        <p
          className="mt-1 pl-7 text-[14px] leading-[1.55]"
          style={{
            color: "hsl(var(--theme-ink-secondary))",
            fontFamily: "var(--theme-font-ui, inherit)",
          }}
        >
          {collapsedIntro}
        </p>
      ) : null}
      {expandedPrelude ? (
        <p
          className="mt-1.5 pl-7 text-[15px] leading-[1.65]"
          style={{
            color: "hsl(var(--theme-ink-secondary))",
            fontFamily: "var(--theme-font-ui, inherit)",
          }}
        >
          {expandedPrelude}
        </p>
      ) : null}
    </header>
  )
}

function PointFrame({
  point,
  pointId,
  onGloss,
  onAcceptPoint,
  acceptingPointId,
  acceptedPointIds,
  glossContext,
  accent,
  glossThread,
  authoring,
  proposalMark,
  focused,
}: {
  point: Point
  pointId?: string
  onGloss?: () => void
  onAcceptPoint?: (draftId: string, pointId: string) => void
  acceptingPointId?: string | null
  acceptedPointIds?: ReadonlySet<string>
  glossContext?: DocumentGlossContext | null
  accent: DocumentSectionWeight
  glossThread?: DocumentGlossThreadInfo | null
  authoring?: PointAuthoringProps | null
  proposalMark?: PointProposalMark
  focused?: boolean
}) {
  const [glossOpen, setGlossOpen] = React.useState(false)
  const canInlineGloss = Boolean(glossContext && point.gloss?.anchor)
  const acceptTarget = resolveAcceptTarget(point, pointId)
  const accepted = isPointAccepted(point, acceptTarget?.pointId ?? pointId, acceptedPointIds)
  const canAccept = Boolean(onAcceptPoint && acceptTarget && !accepted)
  const isAccepting = Boolean(
    acceptTarget && acceptingPointId && acceptingPointId === acceptTarget.pointId,
  )

  const handleGloss = React.useCallback(() => {
    if (canInlineGloss) {
      setGlossOpen(true)
      if (pointId) {
        window.setTimeout(() => scrollToChroniclePoint(pointId), 0)
      }
      return
    }
    onGloss?.()
  }, [canInlineGloss, onGloss, pointId])

  const displayPoint = React.useMemo((): Point => {
    if (!accepted || point.status?.label?.toLowerCase() === "accepted") return point
    return {
      ...point,
      status: {
        label: "accepted",
        tone: "active",
      },
    }
  }, [accepted, point])

  return (
    <div
      className="document-shell-point"
      id={pointId}
      data-chronicle-anchor={pointId}
      style={{
        display: "flex",
        alignItems: "stretch",
        borderRadius: glossOpen || focused ? 10 : 0,
        overflow: "visible",
        background: glossOpen
          ? "hsl(var(--theme-surface-elevated) / 0.72)"
          : focused
            ? "hsl(var(--theme-accent-primary, 42 55% 48%) / 0.08)"
            : "transparent",
        border: glossOpen
          ? glossThread
            ? "1px solid hsl(var(--theme-accent-primary, 42 55% 48%) / 0.35)"
            : "1px solid hsl(var(--theme-border-soft) / 0.35)"
          : focused
            ? "1px solid hsl(var(--theme-accent-primary, 42 55% 48%) / 0.45)"
            : "none",
        borderBottom: glossOpen
          ? undefined
          : "1px solid hsl(var(--theme-border-soft) / 0.22)",
        paddingTop: 10,
        paddingBottom: 12,
        marginBottom: glossOpen ? 8 : 0,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 2,
          flexShrink: 0,
          marginRight: 12,
          borderRadius: 1,
          background: sectionAccentColor(accent),
          opacity: glossThread ? 0.95 : 0.55,
        }}
      />
      <div className="min-w-0 flex-1 pr-1">
        <PointView
          point={displayPoint}
          onGloss={canInlineGloss || onGloss ? handleGloss : undefined}
          onAccept={
            canAccept && acceptTarget
              ? () => onAcceptPoint?.(acceptTarget.draftId, acceptTarget.pointId)
              : undefined
          }
          isAccepting={isAccepting}
          defaultExpanded={Boolean(proposalMark)}
          forceCollapsed={glossOpen}
          glossActive={glossOpen}
          hasGlossThread={Boolean(glossThread && glossThread.messageCount > 0)}
          glossMessageCount={glossThread?.messageCount}
          authoring={authoring}
          proposalMark={proposalMark}
        />
        {glossOpen && glossContext && point.gloss?.anchor ? (
          <DocumentPointGloss
            domainId={glossContext.domainId}
            domainSlug={glossContext.domainSlug}
            dialogId={glossContext.dialogId}
            anchor={point.gloss.anchor}
            snapshot={point.gloss.snapshot}
            pointTitle={point.title}
            onClose={() => setGlossOpen(false)}
            onPointMutated={glossContext.onPointMutated}
            onGlossActivity={glossContext.onGlossActivity}
          />
        ) : null}
      </div>
    </div>
  )
}

type ShellGroup = {
  key: string
  path: DocumentPathGroup | null
  weight: DocumentSectionWeight
  items: Array<{ point: Point; index: number }>
}

function openSectionGroup(
  items: Array<{ point: Point; index: number }>,
): ShellGroup {
  return {
    key: DOCUMENT_OPEN_SECTION.id,
    path: {
      id: DOCUMENT_OPEN_SECTION.id,
      title: DOCUMENT_OPEN_SECTION.title,
      prelude: DOCUMENT_OPEN_SECTION.prelude,
      pointIds: items.map((row) => String(row.index)),
    },
    weight: "open",
    items,
  }
}

function buildGroups(points: Point[], paths?: DocumentPathGroup[]): ShellGroup[] {
  if (!paths || paths.length === 0) {
    return [
      openSectionGroup(points.map((point, index) => ({ point, index }))),
    ]
  }

  const used = new Set<number>()
  const groups: ShellGroup[] = []

  for (const path of paths) {
    const items: Array<{ point: Point; index: number }> = []
    for (const id of path.pointIds) {
      const index = Number.parseInt(id, 10)
      if (!Number.isFinite(index) || index < 0 || index >= points.length) continue
      if (used.has(index)) continue
      used.add(index)
      items.push({ point: points[index]!, index })
    }
    groups.push({ key: path.id, path, weight: "authored", items })
  }

  const leftovers = points
    .map((point, index) => ({ point, index }))
    .filter((row) => !used.has(row.index))
  groups.push(openSectionGroup(leftovers))

  const authored = groups.filter((group) => group.weight === "authored")
  const open = groups.filter((group) => group.weight === "open")
  if (
    authored.length > 0
    && authored.every((group) => group.items.length === 0)
    && open.some((group) => group.items.length > 0)
  ) {
    return [...open, ...authored]
  }

  return groups
}

function resolveForward(
  forward: DocumentForward | undefined,
  title: string | undefined,
  subtitle: string | undefined,
): DocumentForward | null {
  if (forward || title?.trim() || subtitle?.trim()) {
    return resolveDocumentForward({
      forwardTitle: forward?.title,
      forwardDescription: forward?.description ?? subtitle,
      dialogTitle: title,
      imageUrl: forward?.imageUrl,
    })
  }
  return null
}

function isNowPreviewImage(url?: string | null, name?: string | null): boolean {
  const src = `${url ?? ""} ${name ?? ""}`
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(src)
}

function ForwardBlock({
  forward,
  step,
  showInvite,
  editing,
  onSaveForward,
  busy,
  now,
}: {
  forward: DocumentForward
  step?: DocumentStep
  showInvite?: boolean
  editing?: boolean
  onSaveForward?: (title: string, description: string) => void
  busy?: boolean
  now?: DocumentShellProps["now"]
}) {
  const hasStep = Boolean(step?.title?.trim() || step?.body?.trim())
  const [descriptionOpen, setDescriptionOpen] = React.useState(!hasStep)
  const [draftTitle, setDraftTitle] = React.useState(forward.title)
  const [draftDescription, setDraftDescription] = React.useState(forward.description)
  const authoredMediaUrl = forward.imageUrl?.trim()
  const nowPreview = now?.previewUrl?.trim() || null
  const nowIsImage = Boolean(now && isNowPreviewImage(nowPreview, now.name))
  const mediaUrl = nowIsImage ? nowPreview : authoredMediaUrl
  const eyebrow = now ? "Now" : "Forward"
  const nowOpens = Boolean(now?.onOpen) && !editing

  React.useEffect(() => {
    setDescriptionOpen(!hasStep)
  }, [hasStep])

  React.useEffect(() => {
    setDraftTitle(forward.title)
    setDraftDescription(forward.description)
  }, [forward.title, forward.description, editing])

  const titleColor = hasStep
    ? "hsl(var(--theme-ink-secondary))"
    : "hsl(var(--theme-ink-primary))"
  const forwardDirty =
    draftTitle.trim() !== forward.title.trim()
    || draftDescription.trim() !== forward.description.trim()

  return (
    <header className="document-shell-forward px-4 pt-4 pb-2">
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background:
            "linear-gradient(165deg, hsl(var(--theme-surface-elevated) / 0.95) 0%, hsl(var(--theme-surface-paper) / 0.88) 55%, hsl(var(--theme-accent-primary, 42 55% 48%) / 0.08) 100%)",
          border: "1px solid hsl(var(--theme-accent-primary, 42 55% 48%) / 0.32)",
          boxShadow:
            "0 8px 28px hsl(var(--theme-ink-primary) / 0.08), inset 0 1px 0 hsl(var(--theme-surface-paper) / 0.45)",
        }}
      >
        {mediaUrl ? (
          nowOpens ? (
            <button
              type="button"
              onClick={now?.onOpen}
              className="block w-full text-left"
              aria-label={`Open ${now?.name ?? "upload"}`}
            >
              <div
                className="w-full"
                style={{
                  aspectRatio: "2.4 / 1",
                  maxHeight: 168,
                  background: `linear-gradient(180deg, transparent 35%, hsl(var(--theme-surface-paper) / 0.92) 100%), url(${JSON.stringify(mediaUrl)}) center/cover no-repeat`,
                }}
                role="img"
                aria-hidden
              />
            </button>
          ) : (
            <div
              className="w-full"
              style={{
                aspectRatio: "2.4 / 1",
                maxHeight: 168,
                background: `linear-gradient(180deg, transparent 35%, hsl(var(--theme-surface-paper) / 0.92) 100%), url(${JSON.stringify(mediaUrl)}) center/cover no-repeat`,
              }}
              role="img"
              aria-label={now ? now.name : "Document cover"}
            />
          )
        ) : now && nowOpens ? (
          <button
            type="button"
            onClick={now.onOpen}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
            style={{
              borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.35)",
              background: "hsl(var(--theme-surface-elevated) / 0.55)",
            }}
          >
            <span className="min-w-0 truncate text-[13px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
              {now.name}
            </span>
            <span className="shrink-0 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              Open →
            </span>
          </button>
        ) : (
          <div
            aria-hidden
            className="h-1.5 w-full"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--theme-accent-primary, 42 55% 48%) / 0.55), hsl(var(--theme-status-success) / 0.35), transparent)",
            }}
          />
        )}
        <div className="px-4 py-3.5">
          <p
            className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "hsl(var(--theme-accent-primary, 42 55% 48%))" }}
          >
            {eyebrow}
          </p>
          {editing && onSaveForward ? (
            <>
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Forward title"
                aria-label="Forward title"
                className="w-full border-0 bg-transparent px-0 py-0 text-[26px] font-semibold leading-snug outline-none"
                style={{
                  color: titleColor,
                  fontFamily: "var(--theme-font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              />
              <AutoGrowTextarea
                value={draftDescription}
                onChange={setDraftDescription}
                placeholder="Where this Dialog is going"
                ariaLabel="Forward"
                minHeight={96}
                className="mt-2.5 w-full border-0 bg-transparent px-0 py-0 text-[15px] leading-[1.65] outline-none"
                style={{
                  color: "hsl(var(--theme-ink-secondary))",
                  fontFamily: "var(--theme-font-ui, inherit)",
                }}
              />
              <AuthorSaveBar
                saveLabel="Save Forward"
                dirty={forwardDirty}
                busy={busy}
                onSave={() => onSaveForward(draftTitle, draftDescription)}
                onCancel={() => {
                  setDraftTitle(forward.title)
                  setDraftDescription(forward.description)
                }}
              />
            </>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <h2
                  className="min-w-0 flex-1 text-[26px] font-semibold leading-snug"
                  style={{
                    color: titleColor,
                    fontFamily: "var(--theme-font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  {forward.title}
                </h2>
                {forward.description ? (
                  <button
                    type="button"
                    onClick={() => setDescriptionOpen((open) => !open)}
                    className="mt-1 inline-flex shrink-0 items-center justify-center rounded-md p-1.5 transition-opacity hover:opacity-80"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    aria-expanded={descriptionOpen}
                    aria-label={descriptionOpen ? "Collapse description" : "Expand description"}
                  >
                    <ChevronDown
                      className={`h-5 w-5 transition-transform ${descriptionOpen ? "" : "-rotate-90"}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                ) : null}
              </div>

              {forward.description && descriptionOpen ? (
                <p
                  className="mt-2.5 text-[15px] leading-[1.65]"
                  style={{
                    color: "hsl(var(--theme-ink-secondary))",
                    fontFamily: "var(--theme-font-ui, inherit)",
                  }}
                >
                  {forward.description}
                </p>
              ) : null}

              {showInvite ? (
                <p
                  className="mt-2.5 text-[14px] leading-[1.6]"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  The directional objective of this Dialog is not written yet. Use the pencil to write it here.
                </p>
              ) : null}
            </>
          )}

          {hasStep && step ? (
            <div
              className="mt-4 rounded-xl px-4 py-3.5"
              style={{
                background: "hsl(var(--theme-surface-elevated) / 0.5)",
                border: "1px solid hsl(var(--theme-status-success) / 0.42)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <p
                className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "hsl(var(--theme-status-success))" }}
              >
                Now
              </p>
              {step.title?.trim() ? (
                <h3
                  className="text-[18px] font-semibold leading-snug"
                  style={{
                    color: "hsl(var(--theme-status-success))",
                    fontFamily: "var(--theme-font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  {step.title.trim()}
                </h3>
              ) : null}
              {step.body?.trim() ? (
                <p
                  className={`text-[15px] leading-[1.65] ${step.title?.trim() ? "mt-2" : ""}`}
                  style={{
                    color: "hsl(var(--theme-ink-primary))",
                    fontFamily: "var(--theme-font-ui, inherit)",
                  }}
                >
                  {step.body.trim()}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

/**
 * Universal Document container shell — cover + Points in, rendered sequence out.
 * Boards supply data; this owns the shared render loop (no Realm-specific fetch).
 */
function QuietButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-[11px] font-medium"
      style={{
        color: danger
          ? "hsl(var(--theme-status-error))"
          : "hsl(var(--theme-ink-tertiary))",
      }}
    >
      {children}
    </button>
  )
}

function SectionAuthorControls({
  title,
  canMoveUp,
  canMoveDown,
  disabled,
  onRename,
  onDelete,
  onMove,
}: {
  title: string
  canMoveUp: boolean
  canMoveDown: boolean
  disabled?: boolean
  onRename: (title: string) => void
  onDelete: () => void
  onMove: (direction: "up" | "down") => void
}) {
  const [draft, setDraft] = React.useState(title)
  React.useEffect(() => {
    setDraft(title)
  }, [title])
  const dirty = draft.trim() !== title.trim() && draft.trim().length > 0

  return (
    <div className="mb-2 px-1">
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label="Section title"
        className="w-full border-0 bg-transparent py-0.5 text-[14px] font-semibold tracking-[0.04em] outline-none"
        style={{
          color: "hsl(var(--theme-accent-primary))",
          fontFamily: "var(--theme-font-display, 'Cormorant Garamond', Georgia, serif)",
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <AuthorSaveBar
          saveLabel="Save Section"
          dirty={dirty}
          disabled={disabled}
          onSave={() => {
            if (dirty) onRename(draft.trim())
          }}
          onCancel={() => setDraft(title)}
          onDelete={onDelete}
          deleteConfirm="Delete this Section? Its Points move to Open."
          deleteLabel="Delete Section"
        />
        <QuietButton disabled={disabled || !canMoveUp} onClick={() => onMove("up")}>
          Up
        </QuietButton>
        <QuietButton disabled={disabled || !canMoveDown} onClick={() => onMove("down")}>
          Down
        </QuietButton>
      </div>
    </div>
  )
}

export function DocumentShell({
  cover,
  title,
  subtitle,
  forward,
  step,
  paths,
  points,
  pointIds,
  components,
  onOpenComponentDraft,
  onGlossPoint,
  onAcceptPoint,
  acceptingPointId,
  acceptedPointIds,
  acceptError,
  glossContext,
  scrollToPointId,
  breadcrumb,
  emptyState,
  onBringInWriting,
  authoring,
  className,
  proposalMarks,
  now,
}: DocumentShellProps) {
  const [query, setQuery] = React.useState("")
  const [searchOpen, setSearchOpen] = React.useState(false)
  const normalizedQuery = query.trim().toLowerCase()
  const showSearchField = searchOpen || normalizedQuery.length > 0 || points.length >= 8

  const filteredPoints = React.useMemo(() => {
    if (!normalizedQuery) return points
    return points.filter((point) => {
      const hay = [
        point.title,
        point.lede,
        point.body.text,
        point.identity.label,
        point.identity.voice,
        point.identity.subtitle,
      ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase()
      return hay.includes(normalizedQuery)
    })
  }, [points, normalizedQuery])

  const filteredIndexes = React.useMemo(() => {
    if (!normalizedQuery) return null as number[] | null
    const indexes: number[] = []
    points.forEach((point, index) => {
      if (filteredPoints.includes(point)) indexes.push(index)
    })
    return indexes
  }, [points, filteredPoints, normalizedQuery])

  const groups = React.useMemo(() => {
    const base = buildGroups(points, paths)
    if (!filteredIndexes) return base
    const allow = new Set(filteredIndexes)
    return base
      .map((group) => ({
        ...group,
        items: group.items.filter(({ index }) => allow.has(index)),
      }))
      .filter((group) => !filteredIndexes || group.items.length > 0)
  }, [points, paths, filteredIndexes])

  const resolvedForward = React.useMemo(
    () => resolveForward(forward, title, subtitle),
    [forward, title, subtitle],
  )
  const forwardInvite = Boolean(resolvedForward && !resolvedForward.description.trim())
  /** Open stays expanded. Authored Sections start open; the author may collapse them. */
  const [expandedPaths, setExpandedPaths] = React.useState<Record<string, boolean>>({})
  const [editingPoint, setEditingPoint] = React.useState<{
    id: string
    title: string
    body: string
    sectionId: string | null
  } | null>(null)
  const [addingPointKey, setAddingPointKey] = React.useState<string | null>(null)
  const [addingSection, setAddingSection] = React.useState(false)

  React.useEffect(() => {
    if (!authoring?.enabled) {
      setEditingPoint(null)
      setAddingPointKey(null)
      setAddingSection(false)
    }
  }, [authoring?.enabled])

  React.useEffect(() => {
    setExpandedPaths((prev) => {
      const next = { ...prev }
      for (const group of groups) {
        if (next[group.key] !== undefined) continue
        next[group.key] = group.items.length > 0
      }
      return next
    })
  }, [groups, normalizedQuery])

  React.useEffect(() => {
    if (!scrollToPointId || !pointIds?.length) return
    const pointIndex = pointIds.findIndex((id) => id === scrollToPointId)
    if (pointIndex < 0) return
    for (const group of groups) {
      if (group.items.some(({ index }) => index === pointIndex)) {
        setExpandedPaths((prev) => ({ ...prev, [group.key]: true }))
        break
      }
    }
  }, [scrollToPointId, pointIds, groups])

  React.useEffect(() => {
    if (!scrollToPointId) return
    const timer = window.setTimeout(() => scrollToChroniclePoint(scrollToPointId), 0)
    return () => window.clearTimeout(timer)
  }, [scrollToPointId, points])

  return (
    <div className={`document-shell flex min-h-0 flex-1 flex-col overflow-y-auto ${className ?? ""}`}>
      {cover}
      {scrollToPointId && breadcrumb?.length ? (
        <div className="px-4 pt-3 text-[12px] uppercase tracking-wider" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {breadcrumb.join(" · ")}
        </div>
      ) : null}
      {resolvedForward ? (
        <ForwardBlock
          forward={resolvedForward}
          step={step}
          showInvite={forwardInvite}
          editing={authoring?.enabled}
          busy={authoring?.busy}
          onSaveForward={authoring?.onSaveForward}
          now={now}
        />
      ) : null}
      {onBringInWriting ? (
        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={onBringInWriting}
            className="text-[12px] underline underline-offset-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Add writing from outside Keeper
          </button>
        </div>
      ) : null}

      {points.length > 0 ? (
        <div className="px-4 pb-1 pt-2">
          {showSearchField ? (
            <>
              <label className="sr-only" htmlFor="document-shell-search">
                Search Document
              </label>
              <input
                id="document-shell-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find in Points…"
                className="w-full border-0 border-b bg-transparent px-0 py-1.5 text-[13px] outline-none"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                  color: "hsl(var(--theme-ink-primary))",
                  fontFamily: "var(--theme-font-ui, inherit)",
                }}
              />
              {normalizedQuery ? (
                <p className="mt-1 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  {filteredPoints.length === 0
                    ? "No Points match"
                    : `${filteredPoints.length} of ${points.length}`}
                </p>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="text-[12px] font-medium"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Find…
            </button>
          )}
        </div>
      ) : null}

      {acceptError ? (
        <p className="px-4 pb-1 text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
          {acceptError}
        </p>
      ) : null}

      {authoring?.error ? (
        <p className="px-4 pb-1 text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
          {authoring.error}
        </p>
      ) : null}

      <div className="document-shell-paths flex flex-col gap-0 px-4 pb-4 pt-1">
        {groups.map((group, groupIndex) => {
          const accent = group.weight
          const expanded = group.items.length > 0
            ? expandedPaths[group.key] !== false
            : expandedPaths[group.key] === true
          const sectionId = group.weight === "open" ? null : group.path?.id ?? null
          const sectionPointIds = group.items
            .map(({ index }) => pointIds?.[index])
            .filter((id): id is string => Boolean(id))
          const authoredSectionCount = groups.filter((row) => row.weight === "authored").length
          return (
            <section
              key={group.key}
              className="document-shell-path"
              style={{
                padding: group.path ? "8px 0 4px" : "0",
                background: "transparent",
                border: "none",
              }}
            >
              {group.path ? (
                <SectionHeader
                  title={
                    authoring?.enabled && group.weight === "authored"
                      ? undefined
                      : group.path.title
                  }
                  prelude={group.path.prelude}
                  intro={resolveSectionIntro({
                    prelude: group.path.prelude,
                    pointTitles: group.items.map(({ point }) => point.title),
                  })}
                  cues={resolveSectionChangeCues(
                    sectionPointIds.map((id) => proposalMarks?.[id]?.kind),
                  )}
                  imageUrl={group.path.imageUrl}
                  count={group.items.length}
                  weight={group.weight}
                  expanded={expanded}
                  onToggle={() =>
                    setExpandedPaths((prev) => ({
                      ...prev,
                      [group.key]: !expanded,
                    }))
                  }
                />
              ) : null}
              {authoring?.enabled && group.weight === "authored" && group.path ? (
                <SectionAuthorControls
                  title={group.path.title ?? ""}
                  canMoveUp={groupIndex > 0}
                  canMoveDown={groupIndex < authoredSectionCount - 1}
                  disabled={authoring.busy}
                  onRename={(title) => authoring.onRenameSection(group.path!.id, title)}
                  onDelete={() => authoring.onDeleteSection(group.path!.id)}
                  onMove={(direction) => authoring.onMoveSection(group.path!.id, direction)}
                />
              ) : null}
              {expanded ? (
                <div className="flex flex-col">
                  {group.weight === "open" && group.items.length === 0 ? emptyState : null}
                  {group.items.map(({ point, index }) => {
                    const threadKey = point.gloss?.anchor
                      ? buildGlossThreadKey(point.gloss.anchor)
                      : null
                    const glossThread =
                      threadKey && glossContext?.glossThreadsByKey
                        ? glossContext.glossThreadsByKey.get(threadKey) ?? null
                        : null
                    const pointId = pointIds?.[index] ?? undefined
                    const split = splitDisplayedPointForEdit(point)
                    const isEditing = Boolean(pointId && editingPoint?.id === pointId)
                    const pointAuthoring: PointAuthoringProps | null =
                      authoring?.enabled && pointId
                        ? {
                            active: isEditing,
                            title: isEditing ? editingPoint!.title : split.title,
                            body: isEditing ? editingPoint!.body : split.body,
                            busy: authoring.busy,
                            dirty: isEditing
                              ? editingPoint!.title.trim() !== split.title
                                || editingPoint!.body !== split.body
                                || editingPoint!.sectionId !== sectionId
                              : false,
                            onTitleChange: (value) =>
                              setEditingPoint((prev) =>
                                prev && prev.id === pointId ? { ...prev, title: value } : prev,
                              ),
                            onBodyChange: (value) =>
                              setEditingPoint((prev) =>
                                prev && prev.id === pointId ? { ...prev, body: value } : prev,
                              ),
                            onSave: () => {
                              if (!editingPoint || editingPoint.id !== pointId) return
                              authoring.onUpdatePoint(pointId, {
                                title: editingPoint.title,
                                content: editingPoint.body,
                                sectionId: editingPoint.sectionId,
                              })
                              setEditingPoint(null)
                            },
                            onCancel: () => setEditingPoint(null),
                            onDelete: () => {
                              authoring.onDeletePoint(pointId)
                              setEditingPoint(null)
                            },
                            onStartEdit: () => {
                              setAddingPointKey(null)
                              setEditingPoint({
                                id: pointId,
                                title: split.title,
                                body: split.body,
                                sectionId,
                              })
                            },
                            sectionId: isEditing ? editingPoint!.sectionId : sectionId,
                            sections: authoring.sections,
                            openSectionId: DOCUMENT_OPEN_SECTION.id,
                            openSectionTitle: DOCUMENT_OPEN_SECTION.title,
                            onSectionChange: (next) =>
                              setEditingPoint((prev) =>
                                prev && prev.id === pointId ? { ...prev, sectionId: next } : prev,
                              ),
                            canMoveUp: sectionPointIds[0] !== pointId,
                            canMoveDown: sectionPointIds[sectionPointIds.length - 1] !== pointId,
                            onMove: (direction) =>
                              authoring.onMovePoint(sectionPointIds, pointId, direction),
                          }
                        : null
                    return (
                    <div key={`${group.key}-${index}`}>
                    <PointFrame
                      point={point}
                      pointId={pointId}
                      accent={accent}
                      glossContext={glossContext}
                      glossThread={glossThread}
                      onAcceptPoint={onAcceptPoint}
                      acceptingPointId={acceptingPointId}
                      acceptedPointIds={acceptedPointIds}
                      authoring={pointAuthoring}
                      proposalMark={pointId ? proposalMarks?.[pointId] : undefined}
                      focused={Boolean(pointId && scrollToPointId && pointId === scrollToPointId)}
                      onGloss={
                        onGlossPoint && point.gloss?.anchor
                          ? () => onGlossPoint(point, index)
                          : undefined
                      }
                    />
                    </div>
                    )
                  })}
                  {authoring?.enabled ? (
                    addingPointKey === group.key ? (
                      <AddPointEditor
                        disabled={authoring.busy}
                        onSubmit={(title, body) => {
                          authoring.onAddPoint(sectionId, title, body)
                          setAddingPointKey(null)
                        }}
                        onCancel={() => setAddingPointKey(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={authoring.busy}
                        onClick={() => {
                          setEditingPoint(null)
                          setAddingPointKey(group.key)
                        }}
                        className="mt-2 text-left text-[13px] font-semibold"
                        style={{ color: "hsl(var(--theme-accent-primary))" }}
                      >
                        Add Point
                      </button>
                    )
                  ) : null}
                </div>
              ) : null}
            </section>
          )
        })}
        {authoring?.enabled ? (
          <div className="pt-2">
            {addingSection ? (
              <AddNamedEditor
                placeholder="Section title"
                saveLabel="Save Section"
                disabled={authoring.busy}
                onSubmit={(title) => {
                  authoring.onAddSection(title)
                  setAddingSection(false)
                }}
                onCancel={() => setAddingSection(false)}
              />
            ) : (
              <button
                type="button"
                disabled={authoring.busy}
                onClick={() => setAddingSection(true)}
                className="text-[13px] font-semibold"
                style={{ color: "hsl(var(--theme-accent-primary))" }}
              >
                Add Section
              </button>
            )}
          </div>
        ) : null}
      </div>

      {components && components.length > 0 ? (
        <section
          id="document-linked-sections"
          className="mx-4 mb-6 mt-2 border-t pt-3"
          style={{ borderColor: "hsl(var(--theme-border-soft) / 0.28)" }}
          aria-label="Linked Drafts on this Document"
        >
          <p
            className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Linked Drafts
          </p>
          <ul className="space-y-0.5">
            {components.map((component) => {
              const titleText = component.label?.trim() || component.title
              const kindLabel = component.kind.replace(/_/g, " ")
              return (
                <li key={component.draftId}>
                  {onOpenComponentDraft ? (
                    <button
                      type="button"
                      onClick={() => onOpenComponentDraft(component.draftId)}
                      className="flex w-full items-baseline justify-between gap-3 py-1 text-left transition-opacity hover:opacity-80"
                      style={{ color: "hsl(var(--theme-ink-primary))" }}
                    >
                      <span className="text-[13px] font-medium leading-snug">
                        {titleText}
                      </span>
                      <span
                        className="shrink-0 text-[10px] capitalize"
                        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                      >
                        {kindLabel}
                      </span>
                    </button>
                  ) : (
                    <div className="flex w-full items-baseline justify-between gap-3 py-1">
                      <span
                        className="text-[13px] font-medium leading-snug"
                        style={{ color: "hsl(var(--theme-ink-primary))" }}
                      >
                        {titleText}
                      </span>
                      <span
                        className="shrink-0 text-[10px] capitalize"
                        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                      >
                        {kindLabel}
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
