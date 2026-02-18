"use client"

/**
 * KeeperCard
 *
 * Detail view for a Keeper, following the Draft UI design pattern.
 * Shows title, purpose, and optional metadata.
 * Bottom toolbar: Set as Active | ← Dialogue
 */

import * as React from "react"

// =============================================================================
// Types
// =============================================================================

export interface KeeperDetail {
  id: string
  title: string
  purpose?: string | null
  domain?: { id: string; name: string; slug: string } | null
}

export interface KeeperCardProps {
  keeper: KeeperDetail
  isActive?: boolean
  onSetActive?: () => void
  onBackToDialogue: () => void
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

export const KeeperCard: React.FC<KeeperCardProps> = ({
  keeper,
  isActive = false,
  onSetActive,
  onBackToDialogue,
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
          {keeper.title}
        </h2>
        {keeper.purpose && (
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: SURFACE.inkSecondary }}
          >
            {keeper.purpose}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="h-px w-full" style={{ backgroundColor: SURFACE.border }} />

      {/* Content area */}
      <div className="flex-1 min-h-0 px-6 py-4 overflow-auto">
        {keeper.domain && (
          <div className="space-y-2">
            <p
              className="text-[11px] uppercase tracking-[0.25em]"
              style={{ color: SURFACE.inkSecondary }}
            >
              Domain
            </p>
            <p
              className="text-sm font-medium"
              style={{ color: SURFACE.inkPrimary }}
            >
              {keeper.domain.name}
            </p>
          </div>
        )}
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

export default KeeperCard
