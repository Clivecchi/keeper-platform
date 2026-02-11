/**
 * PromptedActionCard
 * Contextual, timely action nudges for sidebar panels.
 *
 * Unlike SidebarCard (static data/navigation), PromptedActionCard surfaces
 * state-driven suggestions: unfinished drafts, pending reviews, agent
 * insights, or session resumptions. These appear and disappear based on
 * what is actually happening in the commons.
 *
 * Visual treatment is intentionally distinct from SidebarCard:
 * - Left accent border instead of full border
 * - Slightly warmer/more urgent background tint
 * - Compact layout with inline action link (not a pill button)
 * - Small "?" help affordance for future contextual help
 *
 * @example
 * <PromptedActionCard
 *   items={[
 *     { label: "You have a draft in progress", detail: "Keeper Heart & Mind journey", actionLabel: "Resume", onAction: () => {} },
 *     { label: "2 moments awaiting review", actionLabel: "Review", onAction: () => {} },
 *   ]}
 * />
 */

import * as React from "react"

const SURFACE = {
  background: "hsl(var(--theme-surface-paper) / 0.42)",
  accent: "var(--theme-ink-secondary)",
  border: "var(--theme-border-soft)",
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
  inkMuted: "var(--theme-ink-secondary)",
  actionInk: "var(--theme-ink-primary)",
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PromptedAction {
  /** Primary prompt text (e.g. "You have a draft in progress") */
  label: string
  /** Optional secondary detail (e.g. journey name, count, timestamp) */
  detail?: string
  /** Label for the inline action link */
  actionLabel: string
  /** Callback when the action link is clicked */
  onAction: () => void
}

export interface PromptedActionCardProps {
  /** List of prompted actions to display */
  items: PromptedAction[]
  /** Optional class name for the outer wrapper */
  className?: string
  /** Callback when the help "?" is clicked (future: contextual help) */
  onHelpClick?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Help tooltip content (shown inline for now, wired to onHelpClick later)
// ─────────────────────────────────────────────────────────────────────────────

const HELP_DESCRIPTION =
  "Prompted actions are contextual nudges based on the current state of " +
  "your commons. They surface unfinished work, items needing attention, " +
  "and insights from Kip \u2014 so you never lose track of what matters."

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PromptedActionCard({
  items,
  className = "",
  onHelpClick,
}: PromptedActionCardProps) {
  const [showHelp, setShowHelp] = React.useState(false)

  if (items.length === 0) return null

  const handleHelpClick = () => {
    if (onHelpClick) {
      onHelpClick()
    } else {
      setShowHelp((prev) => !prev)
    }
  }

  return (
    <div
      className={`rounded-xl border-l-2 px-4 py-3 ${className}`}
      style={{
        borderLeftColor: SURFACE.accent,
        borderTop: `1px solid ${SURFACE.border}`,
        borderRight: `1px solid ${SURFACE.border}`,
        borderBottom: `1px solid ${SURFACE.border}`,
        backgroundColor: SURFACE.background,
      }}
    >
      {/* Header row: subtle label + help affordance */}
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[10px] uppercase tracking-[0.3em] font-medium"
          style={{ color: SURFACE.inkMuted }}
        >
          For you
        </p>
        <button
          type="button"
          onClick={handleHelpClick}
          className="inline-flex items-center justify-center rounded-full h-4 w-4 text-[9px] font-semibold leading-none transition-opacity hover:opacity-70"
          style={{
            color: SURFACE.inkMuted,
            border: `1px solid ${SURFACE.border}`,
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.5)",
          }}
          aria-label="What are prompted actions?"
        >
          ?
        </button>
      </div>

      {/* Help description (inline toggle for now) */}
      {showHelp && (
        <div
          className="mb-3 rounded-lg px-3 py-2 text-xs leading-relaxed"
          style={{
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
            color: SURFACE.inkSecondary,
            border: `1px solid ${SURFACE.border}`,
          }}
        >
          {HELP_DESCRIPTION}
        </div>
      )}

      {/* Prompted action items */}
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-medium leading-snug"
                  style={{ color: SURFACE.inkPrimary }}
                >
                  {item.label}
                </p>
                {item.detail && (
                  <p
                    className="mt-0.5 text-xs leading-snug truncate"
                    style={{ color: SURFACE.inkSecondary }}
                  >
                    {item.detail}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={item.onAction}
                className="shrink-0 text-xs font-medium underline underline-offset-2 decoration-dotted transition-opacity hover:opacity-70"
                style={{ color: SURFACE.actionInk }}
              >
                {item.actionLabel}
              </button>
            </div>
            {index < items.length - 1 && (
              <div
                className="mt-2.5 h-px w-full"
                style={{ backgroundColor: SURFACE.border }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PromptedActionCard
