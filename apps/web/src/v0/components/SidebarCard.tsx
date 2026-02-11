/**
 * SidebarCard
 * Reusable data-driven context card for sidebar panels in frame layouts.
 *
 * Renders a themed card with:
 * - Title and description
 * - Optional bulleted item list
 * - Optional action button
 *
 * This is a pure data card — no custom children. For interactive panels
 * or prompted actions, use a purpose-built component instead.
 *
 * Used by CommonsFrame anchor cards and available for any frame that
 * needs a sidebar with contextual navigation or summary cards.
 *
 * @example
 * <SidebarCard
 *   title="Journeys"
 *   description="Active paths and suggested threads to follow."
 *   items={["Keeper Heart & Mind · 0 moments", "Platform Evolution · 2 moments"]}
 *   actionLabel="Open journeys"
 *   onAction={() => navigateToFrame("journeys")}
 * />
 */

import * as React from "react"

const SURFACE = {
  sideCard: "hsl(var(--theme-surface-paper) / 0.6)",
  border: "var(--theme-border-soft)",
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
}

export interface SidebarCardProps {
  /** Card heading */
  title: string
  /** Brief description shown below the title */
  description: string
  /** Optional bulleted list items */
  items?: string[]
  /** Label for the action button (only shown when onAction is provided) */
  actionLabel?: string
  /** Callback fired when the action button is clicked */
  onAction?: () => void
  /** Override the default background color */
  backgroundColor?: string
  /** Override the default border color */
  borderColor?: string
  /** Optional class name for the outer wrapper */
  className?: string
}

export function SidebarCard({
  title,
  description,
  items,
  actionLabel,
  onAction,
  backgroundColor = SURFACE.sideCard,
  borderColor = SURFACE.border,
  className = "",
}: SidebarCardProps) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${className}`}
      style={{ backgroundColor, borderColor }}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold" style={{ color: SURFACE.inkPrimary }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: SURFACE.inkSecondary }}>
          {description}
        </p>
      </div>

      {items && items.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm" style={{ color: SURFACE.inkSecondary }}>
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "var(--theme-line-hairline)" }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
          style={{
            borderColor: SURFACE.border,
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
            color: SURFACE.inkPrimary,
          }}
        >
          {actionLabel ?? "Open"}
        </button>
      )}
    </div>
  )
}

export default SidebarCard
