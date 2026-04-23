/**
 * SidebarCard
 * Reusable data-driven context card for sidebar panels in frame layouts.
 *
 * Renders a themed card with:
 * - Title (with optional "+" affordance via onAdd)
 * - Description
 * - Optional list of items — each item can be static or clickable
 *
 * Items are modelled as `SidebarCardItem[]`:
 *   - Static items: `{ label: "Members: 5" }` — rendered as a bullet
 *   - Clickable items: `{ label: "My Journey", id: "abc", onClick: () => ... }`
 *     — rendered as a clickable link with subtle hover state
 *
 * This is a pure data card — no custom children. For interactive panels
 * or prompted actions, use a purpose-built component instead.
 *
 * @example
 * <SidebarCard
 *   title="Journeys"
 *   description="Active paths and suggested threads to follow."
 *   items={[
 *     { label: "Keeper Heart & Mind · 0 moments", id: "j1", onClick: () => selectJourney("j1") },
 *     { label: "Platform Evolution · 2 moments", id: "j2", onClick: () => selectJourney("j2") },
 *   ]}
 *   onAdd={() => createJourney()}
 * />
 */

import * as React from "react"
import { Plus } from "lucide-react"

const SURFACE = {
  sideCard: "hsl(var(--theme-surface-paper) / 0.9)",
  border: "hsl(var(--theme-border-soft))",
  inkPrimary: "var(--theme-ink-primary-color)",
  inkSecondary: "var(--theme-ink-secondary-color)",
}

// =============================================================================
// Types
// =============================================================================

export interface SidebarCardItem {
  /** Display text for the item */
  label: string
  /** Optional entity ID (helpful for keying) */
  id?: string
  /** When provided, the item becomes a clickable link */
  onClick?: () => void
  /** When true, shows the item as selected in the list (e.g. IDE nav) */
  isSelected?: boolean
}

export interface SidebarCardProps {
  /** Card heading */
  title: string
  /** Brief description shown below the title */
  description: string
  /** Optional list items — static bullets or clickable links */
  items?: SidebarCardItem[]
  /** When provided, renders a "+" button inline with the title */
  onAdd?: () => void
  /** When provided, the title becomes clickable to show the full list in workspace */
  onTitleClick?: () => void
  /** Override the default background color */
  backgroundColor?: string
  /** Override the default border color */
  borderColor?: string
  /** Optional class name for the outer wrapper */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function SidebarCard({
  title,
  description,
  items,
  onAdd,
  onTitleClick,
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
        <div className="flex items-center justify-between gap-2">
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="text-base font-semibold text-left underline-offset-2 decoration-dotted hover:underline transition-colors"
              style={{ color: SURFACE.inkPrimary }}
            >
              {title}
            </button>
          ) : (
            <h3 className="text-base font-semibold" style={{ color: SURFACE.inkPrimary }}>
              {title}
            </h3>
          )}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center justify-center rounded-full border p-1 transition-colors hover:opacity-80"
              style={{
                borderColor: SURFACE.border,
                color: SURFACE.inkSecondary,
                backgroundColor: "hsl(var(--theme-surface-paper) / 0.8)",
              }}
              aria-label={`Add ${title.toLowerCase()}`}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
        <p className="text-sm" style={{ color: SURFACE.inkSecondary }}>
          {description}
        </p>
      </div>

      {items && items.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm" style={{ color: SURFACE.inkSecondary }}>
          {items.map((item) => (
            <li key={item.id ?? item.label} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: "hsl(var(--theme-line-hairline))" }}
              />
              {item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className={`text-left rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors ${
                    item.isSelected
                      ? "font-medium"
                      : "underline-offset-2 decoration-dotted hover:underline hover:opacity-80"
                  }`}
                  style={{
                    color: SURFACE.inkPrimary,
                    ...(item.isSelected
                      ? { backgroundColor: "hsl(var(--theme-surface-elevated) / 0.85)" }
                      : {}),
                  }}
                >
                  {item.label}
                </button>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SidebarCard
