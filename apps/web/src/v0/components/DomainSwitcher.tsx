"use client"

import * as React from "react"
import {
  SWITCHER_INK_MUTED,
  SWITCHER_INK_PRIMARY,
  SWITCHER_INK_SECONDARY,
  SWITCHER_PANEL_STYLE,
} from "../boards/domain/domainSwitcherTheme"
import type { DomainSwitcherEntry } from "../boards/domain/domainSwitcherData"
import { PlaybillCard } from "./PlaybillCard"

export interface DomainSwitcherProps {
  domains: DomainSwitcherEntry[]
  currentSlug: string
  onSelect: (slug: string) => void
  onAddDomain: () => void
  onClose: () => void
  /** Warm frame + domain payload before navigate (hover). */
  onPrefetchDomain?: (slug: string) => void
}

export function DomainSwitcher({
  domains,
  currentSlug,
  onSelect,
  onAddDomain,
  onClose,
  onPrefetchDomain,
}: DomainSwitcherProps) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-[100]"
        aria-hidden
        onClick={onClose}
      />

      <div
        className="fixed z-[101] flex flex-col overflow-hidden rounded-md"
        style={SWITCHER_PANEL_STYLE}
        role="dialog"
        aria-label="The Playbill"
        aria-modal="false"
      >
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0"
          style={{ borderBottom: "0.5px solid hsl(var(--theme-border-soft))" }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: SWITCHER_INK_MUTED }}
          >
            The Playbill
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-sm transition-opacity hover:opacity-70"
            style={{
              width: 18,
              height: 18,
              color: SWITCHER_INK_SECONDARY,
            }}
            aria-label="Close domain switcher"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path
                d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2 p-2 max-h-[min(480px,65vh)] overflow-y-auto">
          {domains.map((domain) => (
            <PlaybillCard
              key={domain.slug}
              domain={domain}
              isCurrent={domain.slug === currentSlug}
              onSelect={onSelect}
              onClose={onClose}
              onPrefetch={onPrefetchDomain}
              variant="overlay"
            />
          ))}
        </div>

        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={onAddDomain}
            className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left transition-opacity hover:opacity-80"
            style={{
              border: "1px dashed hsl(var(--theme-border-soft) / 0.7)",
              background: "hsl(var(--theme-surface-panel) / 0.5)",
            }}
            aria-label="Add a domain"
          >
            <span
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 16,
                height: 16,
                border: "1px solid hsl(var(--theme-border-soft) / 0.7)",
                color: SWITCHER_INK_SECONDARY,
              }}
              aria-hidden
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path
                  d="M4 1.5V6.5M1.5 4H6.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: SWITCHER_INK_PRIMARY }}
            >
              Add a domain
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
