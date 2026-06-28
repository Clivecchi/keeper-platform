"use client"

import * as React from "react"
import {
  SWITCHER_INK_MUTED,
  SWITCHER_INK_PRIMARY,
  SWITCHER_INK_SECONDARY,
  SWITCHER_PANEL_STYLE,
} from "../boards/domain/domainSwitcherTheme"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DomainEntry {
  slug: string
  name: string
  tagline: string
  coverImageUrl?: string | null
}

export interface DomainSwitcherProps {
  domains: DomainEntry[]
  currentSlug: string
  onSelect: (slug: string) => void
  onAddDomain: () => void
  onClose: () => void
}

const COVER_HEIGHT = 72

function hashSlug(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Deterministic dusk gradient per domain — cover thumb before frame art exists. */
function placeholderCoverBackground(slug: string): string {
  const hash = hashSlug(slug)
  const hueA = 185 + (hash % 48)
  const hueB = (hueA + 28 + (hash % 16)) % 360
  return `linear-gradient(145deg, hsl(${hueA} 38% 24%) 0%, hsl(${hueB} 42% 14%) 52%, hsl(${hueA} 32% 9%) 100%)`
}

function domainInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase()
  }
  return (parts[0]?.slice(0, 1) ?? "?").toUpperCase()
}

// ─── DomainCard ──────────────────────────────────────────────────────────────

function DomainCard({
  domain,
  isCurrent,
  onSelect,
  onClose,
}: {
  domain: DomainEntry
  isCurrent: boolean
  onSelect: (slug: string) => void
  onClose: () => void
}) {
  const handleClick = () => {
    onSelect(domain.slug)
    onClose()
  }

  const hasCoverImage = Boolean(domain.coverImageUrl)
  const initials = domainInitials(domain.name)

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left rounded-md overflow-hidden transition-opacity hover:opacity-90"
      style={{
        border: isCurrent ? "1.5px solid #6ee7b7" : "1px solid hsl(var(--theme-border-soft))",
        background: "hsl(var(--theme-surface-panel, var(--theme-surface-raised)) / 0.92)",
      }}
      aria-current={isCurrent ? "true" : undefined}
      aria-label={`Switch to ${domain.name}${isCurrent ? " (current)" : ""}`}
    >
      <div
        className="relative w-full flex items-end px-2 pb-1.5 overflow-hidden"
        style={{
          height: COVER_HEIGHT,
          ...(hasCoverImage
            ? {
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 55%, transparent 100%), url(${domain.coverImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background: placeholderCoverBackground(domain.slug),
              }),
        }}
      >
        {!hasCoverImage ? (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif select-none"
            style={{
              fontSize: 42,
              fontWeight: 600,
              color: "hsla(0, 0%, 100%, 0.12)",
              letterSpacing: "0.04em",
            }}
            aria-hidden
          >
            {initials}
          </span>
        ) : null}
        <span
          className="relative z-[1] text-[11px] font-medium leading-tight truncate max-w-full font-serif"
          style={{
            color: "hsl(0 0% 98%)",
            textShadow: "0 1px 3px rgba(0,0,0,0.55)",
          }}
        >
          {domain.name}
        </span>
      </div>

      <div
        className="px-2 py-1.5"
        style={{ borderTop: "0.5px solid hsl(var(--theme-border-soft) / 0.6)" }}
      >
        <p
          className="text-[10px] leading-snug truncate"
          style={{ color: SWITCHER_INK_SECONDARY }}
        >
          {domain.tagline || domain.slug}
        </p>
      </div>
    </button>
  )
}

// ─── DomainSwitcher ──────────────────────────────────────────────────────────

export function DomainSwitcher({
  domains,
  currentSlug,
  onSelect,
  onAddDomain,
  onClose,
}: DomainSwitcherProps) {
  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <>
      {/* Click-outside backdrop — transparent, covers full screen */}
      <div
        className="fixed inset-0 z-[100]"
        aria-hidden
        onClick={onClose}
      />

      {/* Panel — fixed to viewport so it is not clipped by board overflow */}
      <div
        className="fixed z-[101] flex flex-col overflow-hidden rounded-md"
        style={{
          ...SWITCHER_PANEL_STYLE,
          width: 210,
        }}
        role="dialog"
        aria-label="Domain switcher"
        aria-modal="false"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0"
          style={{ borderBottom: "0.5px solid hsl(var(--theme-border-soft))" }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: SWITCHER_INK_MUTED }}
          >
            Your Domains
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
            {/* ✕ */}
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

        {/* Domain cards */}
        <div className="flex flex-col gap-1.5 p-2 max-h-[min(420px,60vh)] overflow-y-auto">
          {domains.map((domain) => (
            <DomainCard
              key={domain.slug}
              domain={domain}
              isCurrent={domain.slug === currentSlug}
              onSelect={onSelect}
              onClose={onClose}
            />
          ))}
        </div>

        {/* Add a domain */}
        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={onAddDomain}
            className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left transition-opacity hover:opacity-80"
            style={{
              border: "1px dashed hsl(var(--theme-border-soft) / 0.7)",
              background: "hsl(220 14% 14% / 0.5)",
            }}
            aria-label="Add a domain"
          >
            {/* + circle */}
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
