"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import type { DocumentForward, DocumentPathGroup, DocumentStep, Point } from "@keeper/shared"
import { PointView } from "./PointView"

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
  onGlossPoint?: (point: Point, index: number) => void
  emptyState?: React.ReactNode
  className?: string
}

function PathHeader({ title, prelude }: { title?: string; prelude?: string }) {
  if (!title && !prelude) return null
  return (
    <header className="px-4 pt-5 pb-1">
      {title ? (
        <h3
          className="text-[13px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {title}
        </h3>
      ) : null}
      {prelude ? (
        <p
          className="mt-1 text-[14px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {prelude}
        </p>
      ) : null}
    </header>
  )
}

function PointFrame({
  point,
  onGloss,
}: {
  point: Point
  onGloss?: () => void
}) {
  return (
    <div
      className="document-shell-point px-4 py-3"
      style={{
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.25)",
      }}
    >
      <PointView point={point} onGloss={onGloss} />
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

const BACK_TOOLTIP =
  "No prior step exists yet — Back walks the evolution lineage once more than one Step is known."
const FORWARD_TOOLTIP =
  "This is the current tip. Forward advances once a next step exists — that self-organizing tip is not built yet."

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
  // Mirrors mockup: objectiveOpen = steps.length === 0
  const [descriptionOpen, setDescriptionOpen] = React.useState(!hasStep)

  React.useEffect(() => {
    setDescriptionOpen(!hasStep)
  }, [hasStep])

  const titleColor = hasStep
    ? "hsl(var(--theme-ink-secondary))"
    : "hsl(var(--theme-ink-primary))"

  return (
    <header className="document-shell-forward px-4 pt-5 pb-3">
      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: "hsl(var(--theme-surface-paper) / 0.92)",
          border: "1px solid hsl(var(--theme-border-soft) / 0.45)",
        }}
      >
        <div className="flex items-start gap-2">
          <h2
            className="min-w-0 flex-1 text-[18px] font-semibold leading-snug"
            style={{ color: titleColor }}
          >
            {forward.title}
          </h2>
          {forward.description ? (
            <button
              type="button"
              onClick={() => setDescriptionOpen((open) => !open)}
              className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md p-1 transition-opacity hover:opacity-80"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              aria-expanded={descriptionOpen}
              aria-label={descriptionOpen ? "Collapse description" : "Expand description"}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${descriptionOpen ? "" : "-rotate-90"}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          ) : null}
        </div>

        {forward.description && descriptionOpen ? (
          <p
            className="mt-2 text-[14px] leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {forward.description}
          </p>
        ) : null}

        {hasStep && step ? (
          <div
            className="mt-3 rounded-lg px-3 py-3"
            style={{
              background: "hsl(var(--theme-surface-elevated) / 0.42)",
              border: "1px solid hsl(var(--theme-status-success) / 0.45)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 hsl(var(--theme-surface-paper) / 0.35)",
            }}
          >
            {step.title?.trim() ? (
              <h3
                className="text-[15px] font-semibold leading-snug"
                style={{ color: "hsl(var(--theme-status-success))" }}
              >
                {step.title.trim()}
              </h3>
            ) : null}
            {step.body?.trim() ? (
              <p
                className={`text-[14px] leading-relaxed ${step.title?.trim() ? "mt-1.5" : ""}`}
                style={{ color: "hsl(var(--theme-ink-primary))" }}
              >
                {step.body.trim()}
              </p>
            ) : null}
          </div>
        ) : null}

        <nav
          className="mt-3 flex items-center justify-between gap-3"
          aria-label="Step lineage"
        >
          <button
            type="button"
            disabled
            title={BACK_TOOLTIP}
            aria-label={`Back — ${BACK_TOOLTIP}`}
            className="rounded-md px-3 py-1.5 text-[13px] font-medium opacity-45"
            style={{
              color: "hsl(var(--theme-ink-secondary))",
              border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
              background: "hsl(var(--theme-surface-panel) / 0.5)",
              cursor: "not-allowed",
            }}
          >
            Back
          </button>
          <button
            type="button"
            disabled
            title={FORWARD_TOOLTIP}
            aria-label={`Forward — ${FORWARD_TOOLTIP}`}
            className="rounded-md px-3 py-1.5 text-[13px] font-medium opacity-45"
            style={{
              color: "hsl(var(--theme-ink-secondary))",
              border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
              background: "hsl(var(--theme-surface-panel) / 0.5)",
              cursor: "not-allowed",
            }}
          >
            Forward
          </button>
        </nav>
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
  onGlossPoint,
  emptyState,
  className,
}: DocumentShellProps) {
  const groups = React.useMemo(() => buildGroups(points, paths), [points, paths])
  const resolvedForward = React.useMemo(
    () => resolveForward(forward, title, subtitle),
    [forward, title, subtitle],
  )

  return (
    <div className={`document-shell flex min-h-0 flex-1 flex-col overflow-y-auto ${className ?? ""}`}>
      {cover}
      {!cover && resolvedForward ? (
        <ForwardBlock forward={resolvedForward} step={step} />
      ) : null}

      {points.length === 0 ? emptyState : null}

      {groups.map((group) => (
        <section key={group.key} className="document-shell-path">
          {group.path ? (
            <PathHeader title={group.path.title} prelude={group.path.prelude} />
          ) : null}
          {group.items.map(({ point, index }) => (
            <PointFrame
              key={`${group.key}-${index}`}
              point={point}
              onGloss={
                onGlossPoint && point.gloss?.anchor
                  ? () => onGlossPoint(point, index)
                  : undefined
              }
            />
          ))}
        </section>
      ))}
    </div>
  )
}
