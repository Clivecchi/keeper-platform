"use client"

/**
 * DesignBoardNav (was DesignerFrameNav) — Left panel of the Design Board.
 *
 * Lists all V0 Frames with:
 *   • Display name
 *   • Status dot: green = live domain JSON has content for this frame key
 *                 grey  = no content (null / empty object)
 *   • Active frame is highlighted
 *   • Clicking a frame sets it as the active frame in parent state
 *   • "＋ New Frame" placeholder at the bottom (no action)
 */

import * as React from "react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import { CORE_FRAME_MAP, FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** True if a value from domain JSON is non-empty (object with at least one key, or truthy scalar). */
function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as object).length > 0
  }
  return Boolean(value)
}

// Ordered list of frame keys for the nav (mirrors FRAME_REGISTRY order, designer excluded)
const NAV_FRAME_KEYS = Object.keys(CORE_FRAME_MAP)

// ─── Component ────────────────────────────────────────────────────────────────

interface DesignerFrameNavProps {
  liveDomainFrame: DomainFrameJson | null
  activeFrameKey: string | null
  onSelectFrame: (key: string) => void
}

export function DesignerFrameNav({
  liveDomainFrame,
  activeFrameKey,
  onSelectFrame,
}: DesignerFrameNavProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--theme-border-soft, #e5e7eb)" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--theme-ink-secondary, #6b7280)" }}
        >
          Frame Navigator
        </p>
      </div>

      {/* Frame list */}
      <ul className="flex-1 overflow-y-auto py-2">
        {NAV_FRAME_KEYS.map((key) => {
          const displayName = FRAME_DISPLAY_NAMES[key] ?? key
          const jsonKey = FRAME_TO_JSON_KEY[key] ?? null
          const jsonValue = jsonKey && liveDomainFrame
            ? (liveDomainFrame as any)[jsonKey]
            : null
          const live = hasContent(jsonValue)
          const isActive = key === activeFrameKey

          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelectFrame(key)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: isActive
                    ? "hsl(var(--theme-surface-raised, 0 0% 95%))"
                    : "transparent",
                  borderLeft: isActive ? "2px solid hsl(var(--theme-ink-primary, 0 0% 10%))" : "2px solid transparent",
                }}
              >
                {/* Status dot */}
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    background: live
                      ? "hsl(142 71% 45%)"   // green — has content
                      : "hsl(0 0% 78%)",      // grey  — empty
                  }}
                  title={live ? "Live content" : "No content"}
                />
                {/* Frame name */}
                <span
                  className="text-[13px] leading-snug"
                  style={{
                    color: isActive
                      ? "var(--theme-ink-primary, #111)"
                      : "var(--theme-ink-secondary, #6b7280)",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {displayName}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* New Frame placeholder */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: "var(--theme-border-soft, #e5e7eb)" }}
      >
        <button
          type="button"
          disabled
          className="w-full text-left text-[12px] opacity-40 cursor-not-allowed"
          style={{ color: "var(--theme-ink-secondary, #6b7280)" }}
        >
          ＋ New Frame
        </button>
      </div>
    </div>
  )
}
