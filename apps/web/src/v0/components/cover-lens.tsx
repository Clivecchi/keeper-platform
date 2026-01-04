"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"

// Board Lens selects items; Cover Lens presents them; Cover Frame contains both.
export interface CoverLensItem {
  title: string
  subtitle?: string
  kicker?: string
  affordance?: string
  onClick?: () => void
}

interface CoverLensProps {
  items: CoverLensItem[]
  showLabel?: boolean
  labelText?: string
}

export function CoverLens({ items, showLabel = false, labelText }: CoverLensProps) {
  const navigate = useNavigate()

  const handleItemClick = (item: CoverLensItem) => {
    if (item.onClick) {
      item.onClick()
    } else if (item.title.toLowerCase() === "moments") {
      navigate({ pathname: "/v0", search: "?frame=moment" })
    }
    // Other items don't have navigation yet - this is DTI scope
  }

  return (
    <div className="space-y-3">
      {showLabel && (
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/65">
          {labelText || "Cover Lens"}
        </p>
      )}
      <div
        className="divide-y divide-[hsl(var(--theme-border-soft))] rounded-sm backdrop-blur-sm"
        style={{
          backgroundColor: "hsl(var(--theme-surface-panel))",
          border: `1px solid hsl(var(--theme-border-soft))`,
          boxShadow: "var(--theme-shadow-soft)",
          borderColor: "hsl(var(--theme-border-soft))",
        }}
      >
        {items.map((item, idx) => (
            <button
            key={item.title + idx}
            type="button"
            onClick={() => handleItemClick(item)}
            className="group w-full text-left px-4 md:px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--theme-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--theme-surface-page))] transition-colors hover:bg-[hsl(var(--theme-hover-surface))]"
            style={{
              color: "hsl(var(--theme-ink-primary))",
              borderColor: "hsl(var(--theme-border-soft))",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                {item.kicker && (
                  <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                    {item.kicker}
                  </p>
                )}
                <p
                  className="text-base md:text-lg transition-colors"
                  style={{ color: "hsl(var(--theme-ink-primary))" }}
                >
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-xs leading-snug" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                    {item.subtitle}
                  </p>
                )}
              </div>
              <span
                className="transition-transform duration-150 translate-x-0 group-hover:translate-x-0.5"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                {item.affordance || "→"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

