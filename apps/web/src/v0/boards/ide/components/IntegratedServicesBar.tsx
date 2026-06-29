"use client"

import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceSlug = "railway" | "vercel" | "github"
type ToolSlug = "cloud" | "rendr"
type ServiceStatus = "connected" | "warning" | "disconnected"

export interface IntegratedServicesBarProps {
  /** Opens the integrations panel in Chronicle (Railway, Vercel, GitHub). */
  onOpen: (service?: ServiceSlug) => void
  /** Pins Cloud or Rendr for director delegation (does not swap composer agent or Chronicle). */
  onToolInvoke?: (tool: ToolSlug) => void
  /** Currently pinned instrument — highlights the active tool chip. */
  activeToolSlug?: ToolSlug | null
  railwayStatus: ServiceStatus
  vercelStatus: ServiceStatus
  githubStatus: ServiceStatus
}

const STATUS_DOT: Record<ServiceStatus, string> = {
  connected: "hsl(var(--theme-status-success, 152 69% 43%))",
  warning: "hsl(var(--theme-status-warning, 38 92% 50%))",
  disconnected: "hsl(var(--theme-line-hairline))",
}

const SERVICES: Array<{ slug: ServiceSlug; label: string }> = [
  { slug: "railway", label: "Railway" },
  { slug: "vercel", label: "Vercel" },
  { slug: "github", label: "GitHub" },
]

const TOOLS: Array<{ slug: ToolSlug; label: string }> = [
  { slug: "cloud", label: "Cloud" },
  { slug: "rendr", label: "Rendr" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegratedServicesBar({
  onOpen,
  onToolInvoke,
  activeToolSlug = null,
  railwayStatus,
  vercelStatus,
  githubStatus,
}: IntegratedServicesBarProps) {
  const [barHovered, setBarHovered] = React.useState(false)

  const statusMap: Record<ServiceSlug, ServiceStatus> = {
    railway: railwayStatus,
    vercel: vercelStatus,
    github: githubStatus,
  }

  return (
    <div
      role="presentation"
      onMouseEnter={() => setBarHovered(true)}
      onMouseLeave={() => setBarHovered(false)}
      style={{
        userSelect: "none",
        flex: 1,
        minWidth: 0,
        backgroundColor: barHovered
          ? "hsl(var(--theme-surface-paper) / 0.5)"
          : "transparent",
        transition: "background-color 120ms ease",
      }}
    >
      <div
        className="dialog-services-bar-inner"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          padding: "5px 0 6px",
          flexWrap: "wrap",
          width: "100%",
        }}
      >
        {/* Tools — invokable agents, visually distinct from navigational services */}
        {onToolInvoke && (
          <>
            <BarEyebrow label="Tools" />
            <BarRule />
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 16 }}>
              {TOOLS.map(({ slug, label }) => (
                <ToolChip
                  key={slug}
                  slug={slug}
                  label={label}
                  isActive={activeToolSlug === slug}
                  onInvoke={onToolInvoke}
                />
              ))}
            </div>
          </>
        )}

        {/* Services — integration connections (opens Chronicle) */}
        <BarEyebrow label="Services" />
        <BarRule />
        <div
          role="button"
          tabIndex={0}
          aria-label="Integrated Services — open services panel"
          onClick={() => onOpen()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen() }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "nowrap",
            overflow: "hidden",
            cursor: "pointer",
            flex: 1,
            minWidth: 0,
          }}
        >
          {SERVICES.map(({ slug, label }, idx) => {
            const status = statusMap[slug]
            return (
              <React.Fragment key={slug}>
                {idx > 0 && <ChipDivider />}
                <ServiceChip slug={slug} label={label} status={status} onOpen={onOpen} />
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function BarEyebrow({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: "10px",
        color: "hsl(var(--theme-ink-placeholder))",
        letterSpacing: "0.04em",
        flexShrink: 0,
        marginRight: "12px",
      }}
    >
      {label}
    </span>
  )
}

function BarRule() {
  return (
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
  )
}

function ChipDivider() {
  return (
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
  )
}

function ToolChip({
  slug,
  label,
  isActive,
  onInvoke,
}: {
  slug: ToolSlug
  label: string
  isActive: boolean
  onInvoke: (tool: ToolSlug) => void
}) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <button
      type="button"
      aria-label={
        isActive
          ? `Unpin ${label} — stop delegating to ${label}`
          : `Pin ${label} for delegation`
      }
      title={
        isActive
          ? `Unpin ${label} — Kip keeps the composer`
          : `Pin ${label} — delegate turns to ${label}, Kip synthesizes`
      }
      aria-pressed={isActive}
      onClick={(e) => {
        e.stopPropagation()
        onInvoke(slug)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 8px",
        border: `1px solid ${isActive ? "hsl(var(--theme-ink-primary) / 0.35)" : "hsl(var(--theme-border-soft) / 0.4)"}`,
        borderRadius: "999px",
        backgroundColor: isActive
          ? "hsl(var(--theme-surface-elevated) / 0.9)"
          : hovered
            ? "hsl(var(--theme-surface-paper) / 0.8)"
            : "hsl(var(--theme-surface-paper) / 0.35)",
        cursor: "pointer",
        transition: "background-color 100ms ease, border-color 100ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: isActive
            ? "hsl(var(--theme-ink-primary))"
            : "hsl(var(--theme-ink-tertiary))",
          flexShrink: 0,
        }}
      />
      <span
        className="text-xs"
        style={{
          color: isActive
            ? "var(--theme-ink-primary-color)"
            : "var(--theme-ink-secondary-color)",
          fontWeight: isActive ? 600 : 500,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </button>
  )
}

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
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: STATUS_DOT[status],
          flexShrink: 0,
          ...(isActive ? { boxShadow: "0 0 0 2px hsl(var(--theme-status-success, 152 69% 43%) / 0.18)" } : {}),
        }}
      />
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
