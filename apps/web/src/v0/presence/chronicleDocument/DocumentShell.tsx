"use client"

import * as React from "react"
import type { DocumentPathGroup, Point } from "@keeper/shared"
import { PointView } from "./PointView"

export interface DocumentShellProps {
  /** Optional cover slot above the Point sequence (board-supplied). */
  cover?: React.ReactNode
  /** Document title — shown when no custom cover is provided. */
  title?: string
  subtitle?: string
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

/**
 * Universal Document container shell — cover + Points in, rendered sequence out.
 * Boards supply data; this owns the shared render loop (no Realm-specific fetch).
 */
export function DocumentShell({
  cover,
  title,
  subtitle,
  paths,
  points,
  onGlossPoint,
  emptyState,
  className,
}: DocumentShellProps) {
  const groups = React.useMemo(() => buildGroups(points, paths), [points, paths])

  return (
    <div className={`document-shell flex min-h-0 flex-1 flex-col overflow-y-auto ${className ?? ""}`}>
      {cover}
      {!cover && (title || subtitle) ? (
        <header className="px-4 pt-5 pb-2">
          {title ? (
            <h2
              className="text-[18px] font-semibold leading-snug"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className="mt-1 text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              {subtitle}
            </p>
          ) : null}
        </header>
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
