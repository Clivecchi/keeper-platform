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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DOT_STYLES: Record<ServiceStatus, React.CSSProperties> = {
  connected: {
    backgroundColor: "#3fb950",
    boxShadow: "0 0 4px 1px rgba(63,185,80,0.45)",
  },
  warning: {
    backgroundColor: "#d29922",
  },
  disconnected: {
    backgroundColor: "#484f58",
  },
}

const NAME_COLORS: Record<ServiceStatus, string> = {
  connected: "#8b949e",
  warning: "#d29922",
  disconnected: "#484f58",
}

const SERVICES: Array<{ slug: ServiceSlug; label: string; statusKey: keyof IntegratedServicesBarProps }> = [
  { slug: "cloud",   label: "Cloud",   statusKey: "cloudStatus" },
  { slug: "railway", label: "Railway", statusKey: "railwayStatus" },
  { slug: "vercel",  label: "Vercel",  statusKey: "vercelStatus" },
  { slug: "github",  label: "GitHub",  statusKey: "githubStatus" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegratedServicesBar({
  onOpen,
  cloudStatus,
  railwayStatus,
  vercelStatus,
  githubStatus,
}: IntegratedServicesBarProps) {
  const [hovered, setHovered] = React.useState(false)
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        height: "32px",
        backgroundColor: hovered ? "#21262d" : "#1c2128",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        userSelect: "none",
        transition: "background-color 80ms ease",
      }}
    >
      {/* Label */}
      <div
        style={{
          paddingLeft: "16px",
          paddingRight: "14px",
          fontFamily: "monospace",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#484f58",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Integrated Services
      </div>

      {/* Divider between label and services list */}
      <div style={{ width: "1px", height: "18px", backgroundColor: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

      {/* Services */}
      {SERVICES.map(({ slug, label }) => {
        const status = statusMap[slug]
        return (
          <React.Fragment key={slug}>
            <ServiceItem
              slug={slug}
              label={label}
              status={status}
              onOpen={onOpen}
            />
            {/* Vertical rule between services (not after the last) */}
            {slug !== "github" && (
              <div style={{ width: "1px", height: "18px", backgroundColor: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── ServiceItem ──────────────────────────────────────────────────────────────

function ServiceItem({
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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label} — ${status}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(slug)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation()
          onOpen(slug)
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        paddingLeft: "12px",
        paddingRight: "12px",
        height: "100%",
        cursor: "pointer",
        backgroundColor: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background-color 80ms ease",
        flexShrink: 0,
      }}
    >
      {/* Status dot */}
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          flexShrink: 0,
          ...DOT_STYLES[status],
        }}
      />
      {/* Service name */}
      <span
        style={{
          fontFamily: "monospace",
          fontSize: "10px",
          color: NAME_COLORS[status],
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  )
}
