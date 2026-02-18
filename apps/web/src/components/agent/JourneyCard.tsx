"use client"

/**
 * JourneyCard
 *
 * Detail view for a Journey, following the Draft UI design pattern.
 * Shows title, description (forward), paths as sections, and moments.
 * Bottom toolbar: Set as Active | ← Dialogue
 */

import * as React from "react"

// =============================================================================
// Types
// =============================================================================

export interface JourneyPath {
  id: string
  name: string
}

export interface JourneyMoment {
  id: string
  title: string
  narrative: string
  keptAt?: string | null
  createdAt?: string
}

export interface JourneyDetail {
  id: string
  name: string
  forward: string
  createdAt: string
  updatedAt: string
  keeper: { id: string; title: string } | null
  moment: JourneyMoment[]
  paths: JourneyPath[]
  stats: { totalPaths: number; totalMoments: number }
}

export interface JourneyCardProps {
  journey: JourneyDetail
  isActive?: boolean
  onSetActive?: () => void
  onBackToDialogue: () => void
  onOpenMoment?: (momentId: string) => void
}

// =============================================================================
// Styles
// =============================================================================

const SURFACE = {
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
  border: "var(--theme-border-soft)",
  paper: "hsl(var(--theme-surface-paper) / 0.9)",
}

// =============================================================================
// Component
// =============================================================================

export const JourneyCard: React.FC<JourneyCardProps> = ({
  journey,
  isActive = false,
  onSetActive,
  onBackToDialogue,
  onOpenMoment,
}) => {
  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden"
      style={{
        borderColor: SURFACE.border,
        backgroundColor: SURFACE.paper,
      }}
    >
      {/* Card head */}
      <div className="relative px-6 pt-6 pb-4">
        <div className="absolute top-6 right-6">
          {!isActive && onSetActive && (
            <button
              type="button"
              onClick={onSetActive}
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
              style={{
                borderColor: SURFACE.border,
                color: SURFACE.inkPrimary,
                backgroundColor: "hsl(var(--theme-surface-paper)/0.8)",
              }}
            >
              Set as Active
            </button>
          )}
          {isActive && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium uppercase"
              style={{
                backgroundColor: "hsl(var(--theme-surface-paper)/0.9)",
                color: SURFACE.inkPrimary,
                border: `1px solid ${SURFACE.border}`,
              }}
            >
              Active
            </span>
          )}
        </div>

        <h2
          className="text-2xl font-serif font-semibold pr-32"
          style={{ color: SURFACE.inkPrimary }}
        >
          {journey.name}
        </h2>
        {journey.forward && (
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: SURFACE.inkSecondary }}
          >
            {journey.forward}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="h-px w-full" style={{ backgroundColor: SURFACE.border }} />

      {/* Sections: Paths + Moments */}
      <div className="flex-1 min-h-0 px-6 py-4 overflow-auto">
        <div className="space-y-6">
          {/* Paths */}
          {journey.paths && journey.paths.length > 0 && (
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.25em] mb-3"
                style={{ color: SURFACE.inkSecondary }}
              >
                Paths
              </p>
              <div className="space-y-3">
                {journey.paths.map((path, i) => (
                  <div
                    key={path.id}
                    className="rounded-xl border px-4 py-3"
                    style={{
                      borderColor: SURFACE.border,
                      backgroundColor: "hsl(var(--theme-surface-paper) / 0.5)",
                    }}
                  >
                    <div className="flex gap-3">
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                        style={{
                          backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                          color: SURFACE.inkSecondary,
                          border: `1px solid ${SURFACE.border}`,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: SURFACE.inkPrimary }}
                      >
                        {path.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moments */}
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.25em] mb-3"
              style={{ color: SURFACE.inkSecondary }}
            >
              Moments ({journey.moment?.length ?? 0})
            </p>
            {journey.moment && journey.moment.length > 0 ? (
              <div className="space-y-2">
                {journey.moment.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onOpenMoment?.(m.id)}
                    className="w-full rounded-xl border px-4 py-3 text-left transition-all hover:shadow-sm"
                    style={{
                      borderColor: SURFACE.border,
                      backgroundColor: "hsl(var(--theme-surface-paper) / 0.5)",
                    }}
                  >
                    <div
                      className="text-sm font-medium"
                      style={{ color: SURFACE.inkPrimary }}
                    >
                      {m.title || "Untitled moment"}
                    </div>
                    {m.narrative && (
                      <p
                        className="mt-1 text-xs line-clamp-2"
                        style={{ color: SURFACE.inkSecondary }}
                      >
                        {m.narrative.slice(0, 140)}
                        {m.narrative.length > 140 ? "…" : ""}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p
                className="text-sm"
                style={{ color: SURFACE.inkSecondary }}
              >
                No moments yet. Keep a moment while this journey is active to add it here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div
        className="flex items-center justify-end gap-4 px-6 py-3 border-t"
        style={{
          borderColor: SURFACE.border,
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.95)",
        }}
      >
        <button
          type="button"
          onClick={onBackToDialogue}
          className="text-sm font-medium underline underline-offset-2"
          style={{ color: SURFACE.inkSecondary }}
        >
          ← Dialogue
        </button>
      </div>
    </div>
  )
}

export default JourneyCard
