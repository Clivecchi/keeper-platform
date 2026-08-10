"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import type { DocumentForward, DocumentPathGroup, DocumentStep, Point } from "@keeper/shared"
import { buildGlossThreadKey } from "@keeper/shared"
import { PointView } from "./PointView"
import { DocumentPointGloss } from "./DocumentPointGloss"
import { scrollToChroniclePoint } from "./chronicleMobile"

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
  /** Authored destination — replaces the plain title/subtitle header. */
  forward?: DocumentForward
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
  onGlossPoint?: (point: Point, index: number) => void
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
  className?: string
}

type PathAccent = "progress" | "issue" | "development" | "cast" | "neutral"

function resolvePathAccent(title?: string): PathAccent {
  const key = (title ?? "").trim().toLowerCase()
  if (!key) return "neutral"
  if (/(known\s*issue|issue|gap|blocker)/.test(key)) return "issue"
  if (/(develop|build|ship|work)/.test(key)) return "development"
  if (/(cast|orchestrat|voice|roster)/.test(key)) return "cast"
  if (/(progress|shipped|done|kept)/.test(key)) return "progress"
  return "neutral"
}

function pathAccentColor(accent: PathAccent): string {
  switch (accent) {
    case "progress":
      return "hsl(var(--theme-status-success))"
    case "issue":
      return "hsl(var(--theme-status-warning, 38 70% 48%))"
    case "development":
      return "hsl(var(--theme-focus-ring, 210 45% 52%))"
    case "cast":
      return "hsl(var(--theme-accent-primary, 42 55% 48%))"
    default:
      return "hsl(var(--theme-ink-tertiary))"
  }
}

function PathHeader({
  title,
  prelude,
  imageUrl,
  count,
  accent,
  expanded,
  onToggle,
}: {
  title?: string
  prelude?: string
  imageUrl?: string
  count: number
  accent: PathAccent
  expanded: boolean
  onToggle: () => void
}) {
  if (!title && !prelude && !imageUrl) return null
  const accentColor = pathAccentColor(accent)
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
              ? "Collapse path"
              : "Expand path"
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
              className="truncate text-[14px] font-semibold tracking-[0.04em]"
              style={{
                color: accentColor,
                fontFamily: "var(--theme-font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              {title}
            </h3>
          ) : null}
        </div>
        {count > 0 ? (
          <span
            className="shrink-0 text-[13px] font-medium tabular-nums"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            aria-label={`${count} points`}
          >
            {count}
          </span>
        ) : null}
      </button>
      {expanded && prelude ? (
        <p
          className="mt-1.5 pl-7 text-[15px] leading-[1.65]"
          style={{
            color: "hsl(var(--theme-ink-secondary))",
            fontFamily: "var(--theme-font-ui, inherit)",
          }}
        >
          {prelude}
        </p>
      ) : null}
    </header>
  )
}

function PointFrame({
  point,
  pointId,
  onGloss,
  glossContext,
  accent,
  glossThread,
}: {
  point: Point
  pointId?: string
  onGloss?: () => void
  glossContext?: DocumentGlossContext | null
  accent: PathAccent
  glossThread?: DocumentGlossThreadInfo | null
}) {
  const [glossOpen, setGlossOpen] = React.useState(false)
  const canInlineGloss = Boolean(glossContext && point.gloss?.anchor)

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

  return (
    <div
      className="document-shell-point"
      id={pointId}
      data-chronicle-anchor={pointId}
      style={{
        display: "flex",
        alignItems: "stretch",
        borderRadius: 12,
        // Keep radius when closed; open Gloss must not clip the roomy panel.
        overflow: glossOpen ? "visible" : "hidden",
        background: glossOpen
          ? "hsl(var(--theme-surface-elevated) / 0.88)"
          : "hsl(var(--theme-surface-paper) / 0.78)",
        border: glossThread
          ? "1px solid hsl(var(--theme-accent-primary, 42 55% 48%) / 0.38)"
          : "1px solid hsl(var(--theme-border-soft) / 0.42)",
        boxShadow: glossOpen
          ? "0 4px 18px hsl(var(--theme-ink-primary) / 0.08)"
          : "0 1px 2px hsl(var(--theme-ink-primary) / 0.04)",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 3,
          flexShrink: 0,
          background: pathAccentColor(accent),
          opacity: 0.85,
        }}
      />
      <div className="min-w-0 flex-1 px-3.5 py-3">
        <PointView
          point={point}
          onGloss={canInlineGloss || onGloss ? handleGloss : undefined}
          defaultExpanded={false}
          forceCollapsed={glossOpen}
          glossActive={glossOpen}
          hasGlossThread={Boolean(glossThread && glossThread.messageCount > 0)}
          glossMessageCount={glossThread?.messageCount}
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
  items: Array<{ point: Point; index: number }>
}

function buildGroups(points: Point[], paths?: DocumentPathGroup[]): ShellGroup[] {
  if (!paths || paths.length === 0) {
    return [
      {
        key: "flat",
        path: null,
        items: points.map((point, index) => ({ point, index })),
      },
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
    groups.push({ key: path.id, path, items })
  }

  const leftovers = points
    .map((point, index) => ({ point, index }))
    .filter((row) => !used.has(row.index))
  if (leftovers.length > 0) {
    groups.push({ key: "ungrouped", path: null, items: leftovers })
  }

  return groups
}

function resolveForward(
  forward: DocumentForward | undefined,
  title: string | undefined,
  subtitle: string | undefined,
): DocumentForward | null {
  if (forward?.title?.trim()) {
    return {
      title: forward.title.trim(),
      description: forward.description?.trim() ?? "",
    }
  }
  if (title?.trim() || subtitle?.trim()) {
    return {
      title: title?.trim() || "Forward",
      description: subtitle?.trim() || "",
    }
  }
  return null
}

function ForwardBlock({
  forward,
  step,
}: {
  forward: DocumentForward
  step?: DocumentStep
}) {
  const hasStep = Boolean(step?.title?.trim() || step?.body?.trim())
  const [descriptionOpen, setDescriptionOpen] = React.useState(!hasStep)
  const mediaUrl = forward.imageUrl?.trim()

  React.useEffect(() => {
    setDescriptionOpen(!hasStep)
  }, [hasStep])

  const titleColor = hasStep
    ? "hsl(var(--theme-ink-secondary))"
    : "hsl(var(--theme-ink-primary))"

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
          <div
            className="w-full"
            style={{
              aspectRatio: "2.4 / 1",
              maxHeight: 168,
              background: `linear-gradient(180deg, transparent 35%, hsl(var(--theme-surface-paper) / 0.92) 100%), url(${JSON.stringify(mediaUrl)}) center/cover no-repeat`,
            }}
            role="img"
            aria-label="Document cover"
          />
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
            Forward
          </p>
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
export function DocumentShell({
  cover,
  title,
  subtitle,
  forward,
  step,
  paths,
  points,
  pointIds,
  onGlossPoint,
  glossContext,
  scrollToPointId,
  breadcrumb,
  emptyState,
  className,
}: DocumentShellProps) {
  const [query, setQuery] = React.useState("")
  const normalizedQuery = query.trim().toLowerCase()

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
      .filter((group) => group.items.length > 0)
  }, [points, paths, filteredIndexes])

  const resolvedForward = React.useMemo(
    () => resolveForward(forward, title, subtitle),
    [forward, title, subtitle],
  )
  /** Named Paths start collapsed for density; Progress expands by default. */
  const [expandedPaths, setExpandedPaths] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    setExpandedPaths((prev) => {
      const next = { ...prev }
      for (const group of groups) {
        if (!group.path) continue
        if (next[group.key] !== undefined) continue
        const accent = resolvePathAccent(group.path.title)
        next[group.key] = accent === "progress" || Boolean(normalizedQuery)
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
      {!cover && resolvedForward ? (
        <ForwardBlock forward={resolvedForward} step={step} />
      ) : null}

      {points.length > 0 ? (
        <div className="px-4 pb-2 pt-1">
          <label className="sr-only" htmlFor="document-shell-search">
            Search Document
          </label>
          <input
            id="document-shell-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Points…"
            className="w-full rounded-xl border px-3.5 py-2.5 text-[14px] outline-none focus:ring-1"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.55)",
              background: "hsl(var(--theme-surface-paper) / 0.72)",
              color: "hsl(var(--theme-ink-primary))",
              fontFamily: "var(--theme-font-ui, inherit)",
              ["--tw-ring-color" as string]: "hsl(var(--theme-accent-primary, 42 55% 48%) / 0.45)",
            }}
          />
          {normalizedQuery ? (
            <p className="mt-1.5 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              {filteredPoints.length === 0
                ? "No Points match"
                : `${filteredPoints.length} of ${points.length} Points`}
            </p>
          ) : null}
        </div>
      ) : null}

      {points.length === 0 ? emptyState : null}

      <div className="document-shell-paths flex flex-col gap-3 px-4 pb-6 pt-1">
        {groups.map((group) => {
          const accent = resolvePathAccent(group.path?.title)
          const isNamedPath = Boolean(group.path)
          const expanded = !isNamedPath || expandedPaths[group.key] === true
          return (
            <section
              key={group.key}
              className="document-shell-path"
              style={{
                borderRadius: 12,
                padding: group.path ? "10px 12px 10px" : "0",
                background: group.path
                  ? "hsl(var(--theme-surface-paper) / 0.58)"
                  : "transparent",
                border: group.path
                  ? "1px solid hsl(var(--theme-border-soft) / 0.3)"
                  : "none",
              }}
            >
              {group.path ? (
                <PathHeader
                  title={group.path.title}
                  prelude={group.path.prelude}
                  imageUrl={group.path.imageUrl}
                  count={group.items.length}
                  accent={accent}
                  expanded={expanded}
                  onToggle={() =>
                    setExpandedPaths((prev) => ({
                      ...prev,
                      [group.key]: !expanded,
                    }))
                  }
                />
              ) : null}
              {expanded ? (
                <div className="flex flex-col gap-2.5">
                  {group.items.map(({ point, index }) => {
                    const threadKey = point.gloss?.anchor
                      ? buildGlossThreadKey(point.gloss.anchor)
                      : null
                    const glossThread =
                      threadKey && glossContext?.glossThreadsByKey
                        ? glossContext.glossThreadsByKey.get(threadKey) ?? null
                        : null
                    return (
                    <PointFrame
                      key={`${group.key}-${index}`}
                      point={point}
                      pointId={pointIds?.[index] ?? undefined}
                      accent={accent}
                      glossContext={glossContext}
                      glossThread={glossThread}
                      onGloss={
                        onGlossPoint && point.gloss?.anchor
                          ? () => onGlossPoint(point, index)
                          : undefined
                      }
                    />
                    )
                  })}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
