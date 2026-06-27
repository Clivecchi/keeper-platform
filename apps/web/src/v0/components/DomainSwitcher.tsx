"use client"

import * as React from "react"

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

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left rounded-md overflow-hidden transition-opacity hover:opacity-90"
      style={{
        // #6ee7b7 is the "primary" teal border already used throughout the
        // Board chrome (DomainBoard.tsx primary badge, DesignBoardFrameList.tsx).
        border: isCurrent ? "1.5px solid #6ee7b7" : "1px solid hsl(var(--theme-border-soft))",
        background: "hsl(var(--theme-surface-paper) / 1)",
      }}
      aria-current={isCurrent ? "true" : undefined}
      aria-label={`Switch to ${domain.name}${isCurrent ? " (current)" : ""}`}
    >
      {/* Cover area — 40px */}
      <div
        className="relative w-full flex items-end px-2 pb-1"
        style={{
          height: 40,
          ...(domain.coverImageUrl
            ? {
                backgroundImage: `url(${domain.coverImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                // Gradient placeholder built from theme tokens
                background:
                  "linear-gradient(135deg, hsl(var(--theme-surface-raised, var(--theme-surface-paper)) / 1) 0%, hsl(var(--theme-border-soft) / 0.4) 100%)",
              }),
        }}
      >
        <span
          className="relative z-[1] text-[11px] font-medium leading-tight truncate max-w-full"
          style={{
            color: domain.coverImageUrl
              ? "#ffffff"
              : "var(--theme-ink-primary-color)",
            textShadow: domain.coverImageUrl
              ? "0 1px 2px rgba(0,0,0,0.5)"
              : "none",
          }}
        >
          {domain.name}
        </span>
      </div>

      {/* Meta area */}
      <div className="px-2 py-1.5">
        <p
          className="text-[10px] leading-snug truncate"
          style={{ color: "var(--theme-ink-secondary-color)" }}
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
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute z-50 flex flex-col overflow-hidden rounded-md"
        style={{
          top: 72,        // flush below KeeperTopBar (40px row 1 + 32px row 2)
          left: 0,
          width: 210,
          border: "1px solid hsl(var(--theme-border-soft))",
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.98)",
          backdropFilter: "blur(8px)",
          boxShadow:
            "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
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
            style={{ color: "var(--theme-ink-secondary-color)" }}
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
              color: "var(--theme-ink-secondary-color)",
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
              border: "1px dashed hsl(var(--theme-border-soft))",
              background: "transparent",
            }}
            aria-label="Add a domain"
          >
            {/* + circle */}
            <span
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 16,
                height: 16,
                border: "1px solid hsl(var(--theme-border-soft))",
                color: "var(--theme-ink-secondary-color)",
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
              className="text-[11px]"
              style={{ color: "var(--theme-ink-secondary-color)" }}
            >
              Add a domain
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
