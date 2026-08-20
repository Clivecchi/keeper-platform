"use client"

import * as React from "react"
import {
  CastCueBar,
  type CastMemberChip,
} from "./CastCueBar"

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceSlug = "railway" | "vercel" | "github"
type ServiceStatus = "connected" | "warning" | "disconnected"

export interface IntegratedServicesBarProps {
  /** Opens the integrations panel in Chronicle (Railway, Vercel, GitHub). */
  onOpen: (service?: ServiceSlug) => void
  /** Director-mode agent chips — same CastCueBar as Domain / Realm / Designer. */
  instruments?: ReadonlyArray<CastMemberChip>
  /** Pins an instrument for director delegation (does not swap composer agent). */
  onInstrumentInvoke?: (slug: string) => void
  /** Currently pinned instrument — highlights the active agent chip. */
  activeInstrumentSlug?: string | null
  /** Eyebrow for invokable agent chips. */
  agentsEyebrow?: string
  railwayStatus: ServiceStatus
  vercelStatus: ServiceStatus
  githubStatus: ServiceStatus
  /**
   * @deprecated Prefer instruments + onInstrumentInvoke + activeInstrumentSlug.
   * Kept for transitional call sites that still pass tool slugs.
   */
  onToolInvoke?: (tool: "cloud" | "rendr") => void
  /** @deprecated Prefer activeInstrumentSlug */
  activeToolSlug?: "cloud" | "rendr" | null
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

const FALLBACK_TOOL_INSTRUMENTS: CastMemberChip[] = [
  { slug: "cloud", label: "Cloud" },
  { slug: "rendr", label: "Rendr" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegratedServicesBar({
  onOpen,
  instruments,
  onInstrumentInvoke,
  activeInstrumentSlug = null,
  agentsEyebrow = "Agents",
  railwayStatus,
  vercelStatus,
  githubStatus,
  onToolInvoke,
  activeToolSlug = null,
}: IntegratedServicesBarProps) {
  const statusMap: Record<ServiceSlug, ServiceStatus> = {
    railway: railwayStatus,
    vercel: vercelStatus,
    github: githubStatus,
  }

  const resolvedInstruments = instruments?.length
    ? instruments
    : onToolInvoke
      ? FALLBACK_TOOL_INSTRUMENTS
      : []

  const resolvedInvoke =
    onInstrumentInvoke
    ?? (onToolInvoke
      ? (slug: string) => {
          if (slug === "cloud" || slug === "rendr") onToolInvoke(slug)
        }
      : undefined)

  const resolvedActive = activeInstrumentSlug ?? activeToolSlug

  const servicesSection = (
    <>
      <span style={{ marginLeft: resolvedInstruments.length ? 16 : 0 }} />
      <BarEyebrow label="Services" />
      <BarRule />
      <div
        role="button"
        tabIndex={0}
        aria-label="Integrated Services — open services panel"
        onClick={() => onOpen()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen()
        }}
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
    </>
  )

  if (resolvedInstruments.length > 0 && resolvedInvoke) {
    return (
      <CastCueBar
        eyebrow={agentsEyebrow}
        instruments={resolvedInstruments}
        activeSlug={resolvedActive}
        onInvoke={resolvedInvoke}
        after={servicesSection}
      />
    )
  }

  // Services-only (no agent instruments)
  return (
    <div
      role="presentation"
      style={{ userSelect: "none", flex: 1, minWidth: 0 }}
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
        {servicesSection}
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
          ...(isActive
            ? {
                boxShadow:
                  "0 0 0 2px hsl(var(--theme-status-success, 152 69% 43%) / 0.18)",
              }
            : {}),
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
