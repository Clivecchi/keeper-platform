"use client"

import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceSlug = "cloud" | "railway" | "vercel" | "github"
type ServiceStatus = "connected" | "warning" | "disconnected"

export interface IntegratedServicesBarProps {
  onOpen: (service?: ServiceSlug) => void
  cloudStatus: ServiceStatus
  railwayStatus: ServiceStatus
  vercelStatus: ServiceStatus
  githubStatus: ServiceStatus
}

// ─── Dot colours — match SessionBannerCard's active/inactive palette exactly ──

const DOT_COLOR: Record<ServiceStatus, string> = {
  connected:    "rgb(16 185 129)",
  warning:      "rgb(234 179 8)",
  disconnected: "rgb(209 213 219)",
}

const SERVICES: Array<{ slug: ServiceSlug; label: string }> = [
  { slug: "cloud",   label: "Cloud" },
  { slug: "railway", label: "Railway" },
  { slug: "vercel",  label: "Vercel" },
  { slug: "github",  label: "GitHub" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegratedServicesBar({
  onOpen,
  cloudStatus,
  railwayStatus,
  vercelStatus,
  githubStatus,
}: IntegratedServicesBarProps) {
  const [barHovered, setBarHovered] = React.useState(false)

  const statusMap: Record<ServiceSlug, ServiceStatus> = {
    cloud:   cloudStatus,
    railway: railwayStatus,
    vercel:  vercelStatus,
    github:  githubStatus,
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Integrated Services — open services panel"
      onClick={() => onOpen()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen() }}
      onMouseEnter={() => setBarHovered(true)}
      onMouseLeave={() => setBarHovered(false)}
      style={{
        cursor: "pointer",
        userSelect: "none",
        borderTop: "1px solid hsl(var(--theme-line-hairline))",
        backgroundColor: barHovered
          ? "hsl(var(--theme-surface-paper) / 0.5)"
          : "transparent",
        transition: "background-color 120ms ease",
      }}
    >
      {/* Inner row — aligned with the SessionBannerCard's px-4 container */}
      <div
        className="mx-auto w-full max-w-3xl"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0",
          padding: "5px 16px",
        }}
      >
        {/* "Services" eyebrow label */}
        <span
          style={{
            fontSize: "10px",
            color: "var(--theme-ink-tertiary-color)",
            letterSpacing: "0.04em",
            flexShrink: 0,
            marginRight: "12px",
          }}
        >
          Services
        </span>

        {/* Thin vertical rule */}
        <span
          style={{
            display: "inline-block",
            width: "1px",
            height: "12px",
            backgroundColor: "hsl(var(--theme-line-hairline))",
            flexShrink: 0,
            marginRight: "12px",
          }}
        />

        {/* Service chips */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap", overflow: "hidden" }}>
          {SERVICES.map(({ slug, label }, idx) => {
            const status = statusMap[slug]
            return (
              <React.Fragment key={slug}>
                {idx > 0 && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "1px",
                      height: "10px",
                      backgroundColor: "hsl(var(--theme-line-hairline))",
                      flexShrink: 0,
                      margin: "0 6px",
                    }}
                  />
                )}
                <ServiceChip
                  slug={slug}
                  label={label}
                  status={status}
                  onOpen={onOpen}
                />
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── ServiceChip ──────────────────────────────────────────────────────────────

function ServiceChip({
  slug,
  label,
  status,
  onOpen,
}: {
  slug: ServiceSlug
  label: string
  status: ServiceStatus
  onOpen: (service: ServiceSlug) => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const isActive = status === "connected"

  return (
    <button
      type="button"
      aria-label={`${label} — ${status}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(slug)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 6px",
        border: "none",
        borderRadius: "4px",
        backgroundColor: hovered
          ? "hsl(var(--theme-surface-paper) / 0.8)"
          : "transparent",
        cursor: "pointer",
        transition: "background-color 100ms ease",
        flexShrink: 0,
      }}
    >
      {/* Status dot — same sizing as SessionBannerCard (h-1.5 w-1.5) */}
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: DOT_COLOR[status],
          flexShrink: 0,
          ...(isActive ? { boxShadow: "0 0 0 2px rgba(16,185,129,0.18)" } : {}),
        }}
      />
      {/* Label */}
      <span
        className="text-xs"
        style={{
          color: isActive
            ? "var(--theme-ink-secondary-color)"
            : "var(--theme-ink-tertiary-color)",
          fontWeight: isActive ? 500 : 400,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </button>
  )
}
