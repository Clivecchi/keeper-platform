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
  count,
  accent,
}: {
  title?: string
  prelude?: string
  count: number
  accent: PathAccent
}) {
  if (!title && !prelude) return null
  const accentColor = pathAccentColor(accent)
  return (
    <header className="document-shell-path__header px-1 pb-3 pt-1">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: accentColor }}
            aria-hidden
          />
          {title ? (
            <h3
              className="truncate text-[16px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: accentColor }}
            >
              {title}
            </h3>
          ) : null}
        </div>
        {count > 0 ? (
          <span
            className="shrink-0 text-[15px] font-medium tabular-nums"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            aria-label={`${count} points`}
          >
            {count}
          </span>
        ) : null}
      </div>
      {prelude ? (
        <p
          className="mt-2 pl-5 text-[17px] leading-relaxed"
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
  accent,
}: {
  point: Point
  onGloss?: () => void
  accent: PathAccent
}) {
  return (
    <div
      className="document-shell-point"
      style={{
        display: "flex",
        alignItems: "stretch",
        borderRadius: 10,
        overflow: "hidden",
        background: "hsl(var(--theme-surface-paper) / 0.72)",
        border: "1px solid hsl(var(--theme-border-soft) / 0.42)",
        boxShadow: "0 1px 2px hsl(var(--theme-ink-primary) / 0.04)",
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
      <div className="min-w-0 flex-1 px-4 py-3.5">
        <PointView point={point} onGloss={onGloss} />
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
          border: "1px solid hsl(var(--theme-accent-primary, 42 55% 48%) / 0.35)",
          boxShadow: "0 1px 3px hsl(var(--theme-ink-primary) / 0.06)",
        }}
      >
        <p
          className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "hsl(var(--theme-accent-primary, 42 55% 48%))" }}
        >
          Forward
        </p>
        <div className="flex items-start gap-2">
          <h2
            className="min-w-0 flex-1 text-[24px] font-semibold leading-snug"
            style={{
              color: titleColor,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
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
            className="mt-2.5 text-[17px] leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {forward.description}
          </p>
        ) : null}

        {hasStep && step ? (
          <div
            className="mt-4 rounded-lg px-4 py-3.5"
            style={{
              background: "hsl(var(--theme-surface-elevated) / 0.42)",
              border: "1px solid hsl(var(--theme-status-success) / 0.45)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 hsl(var(--theme-surface-paper) / 0.35)",
            }}
          >
            <p
              className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "hsl(var(--theme-status-success))" }}
            >
              Now
            </p>
            {step.title?.trim() ? (
              <h3
                className="text-[18px] font-semibold leading-snug"
                style={{ color: "hsl(var(--theme-status-success))" }}
              >
                {step.title.trim()}
              </h3>
            ) : null}
            {step.body?.trim() ? (
              <p
                className={`text-[17px] leading-relaxed ${step.title?.trim() ? "mt-2" : ""}`}
                style={{ color: "hsl(var(--theme-ink-primary))" }}
              >
                {step.body.trim()}
              </p>
            ) : null}
          </div>
        ) : null}

        <nav
          className="mt-4 flex items-center justify-between gap-3"
          aria-label="Step lineage"
        >
          <button
            type="button"
            disabled
            title={BACK_TOOLTIP}
            aria-label={`Back — ${BACK_TOOLTIP}`}
            className="rounded-md px-3.5 py-2 text-[15px] font-medium opacity-45"
            style={{
              color: "hsl(var(--theme-ink-secondary))",
              border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
              background: "hsl(var(--theme-surface-panel) / 0.5)",
              cursor: "not-allowed",
            }}
          >
            ← Back
          </button>
          <button
            type="button"
            disabled
            title={FORWARD_TOOLTIP}
            aria-label={`Forward — ${FORWARD_TOOLTIP}`}
            className="rounded-md px-3.5 py-2 text-[15px] font-medium opacity-45"
            style={{
              color: "hsl(var(--theme-ink-secondary))",
              border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
              background: "hsl(var(--theme-surface-panel) / 0.5)",
              cursor: "not-allowed",
            }}
          >
            Forward →
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

      <div className="document-shell-paths flex flex-col gap-5 px-4 pb-6 pt-1">
        {groups.map((group) => {
          const accent = resolvePathAccent(group.path?.title)
          return (
            <section
              key={group.key}
              className="document-shell-path"
              style={{
                borderRadius: 12,
                padding: group.path ? "12px 12px 10px" : "0",
                background: group.path
                  ? "hsl(var(--theme-surface-panel) / 0.28)"
                  : "transparent",
                border: group.path
                  ? "1px solid hsl(var(--theme-border-soft) / 0.35)"
                  : "none",
              }}
            >
              {group.path ? (
                <PathHeader
                  title={group.path.title}
                  prelude={group.path.prelude}
                  count={group.items.length}
                  accent={accent}
                />
              ) : null}
              <div className="flex flex-col gap-2.5">
                {group.items.map(({ point, index }) => (
                  <PointFrame
                    key={`${group.key}-${index}`}
                    point={point}
                    accent={accent}
                    onGloss={
                      onGlossPoint && point.gloss?.anchor
                        ? () => onGlossPoint(point, index)
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
