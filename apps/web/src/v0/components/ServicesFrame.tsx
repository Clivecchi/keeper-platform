"use client"

import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceSlug = "cloud" | "railway" | "vercel" | "github"

export interface ServicesFrameProps {
  initialService?: ServiceSlug
  onClose?: () => void
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: Array<{ slug: ServiceSlug; label: string }> = [
  { slug: "cloud",   label: "Cloud" },
  { slug: "railway", label: "Railway" },
  { slug: "vercel",  label: "Vercel" },
  { slug: "github",  label: "GitHub" },
]

// ─── Section content ─────────────────────────────────────────────────────────

function CloudSection() {
  return (
    <div style={{ padding: "20px 20px 24px" }}>
      <p style={{ fontSize: "12px", lineHeight: "1.65", color: "var(--theme-ink-secondary-color)", marginBottom: "16px" }}>
        Cloud is Kip&apos;s technical subagent. It has access to the codebase, Railway, Vercel, and GitHub. Invoke Cloud through Kip in the conversation.
      </p>
      <StatusRow label="Agent" value="Registered" detail="claude-sonnet-4-6" connected />
    </div>
  )
}

function RailwaySection() {
  return (
    <div style={{ padding: "20px 20px 24px" }}>
      <p style={{ fontSize: "12px", lineHeight: "1.65", color: "var(--theme-ink-secondary-color)", marginBottom: "16px" }}>
        Connect Railway to enable backend deployment from the IDE Board.
      </p>
      <StatusRow label="Status" value="Not connected" />
      <div style={{ marginTop: "16px" }}>
        <ConnectButton label="Connect Railway" onClick={() => { /* TODO: Railway OAuth */ }} />
      </div>
    </div>
  )
}

function VercelSection() {
  return (
    <div style={{ padding: "20px 20px 24px" }}>
      <p style={{ fontSize: "12px", lineHeight: "1.65", color: "var(--theme-ink-secondary-color)", marginBottom: "16px" }}>
        Connect Vercel to enable frontend deployment and preview URLs from the IDE Board.
      </p>
      <StatusRow label="Status" value="Not connected" />
      <div style={{ marginTop: "16px" }}>
        <ConnectButton label="Connect Vercel" onClick={() => { /* TODO: Vercel OAuth */ }} />
      </div>
    </div>
  )
}

function GitHubSection() {
  return (
    <div style={{ padding: "20px 20px 24px" }}>
      <p style={{ fontSize: "12px", lineHeight: "1.65", color: "var(--theme-ink-secondary-color)", marginBottom: "16px" }}>
        Connect GitHub to surface branch status, commits, and pull requests from the IDE Board.
      </p>
      <StatusRow label="Status" value="Not connected" />
      <div style={{ marginTop: "16px" }}>
        <ConnectButton label="Connect GitHub" onClick={() => { /* TODO: GitHub OAuth */ }} />
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatusRow({
  label,
  value,
  detail,
  connected,
}: {
  label: string
  value: string
  detail?: string
  connected?: boolean
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        padding: "6px 0",
        borderTop: "1px solid hsl(var(--theme-line-hairline))",
        color: "var(--theme-ink-tertiary-color)",
      }}
    >
      <span>{label}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span
        style={{
          color: connected ? "rgb(16 185 129)" : "var(--theme-ink-tertiary-color)",
          fontWeight: connected ? 500 : 400,
        }}
      >
        {value}
      </span>
      {detail && (
        <>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{detail}</span>
        </>
      )}
    </div>
  )
}

function ConnectButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: "12px",
        padding: "6px 14px",
        border: "1px solid hsl(var(--theme-border-soft))",
        borderRadius: "6px",
        color: "var(--theme-ink-secondary-color)",
        backgroundColor: hovered
          ? "hsl(var(--theme-surface-paper) / 0.8)"
          : "transparent",
        cursor: "pointer",
        transition: "background-color 100ms ease",
      }}
    >
      {label}
    </button>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: ServiceSlug; onChange: (s: ServiceSlug) => void }) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid hsl(var(--theme-line-hairline))",
        flexShrink: 0,
      }}
    >
      {TABS.map(({ slug, label }) => {
        const isActive = slug === active
        return (
          <button
            key={slug}
            type="button"
            onClick={() => onChange(slug)}
            style={{
              fontSize: "11px",
              padding: "8px 14px",
              border: "none",
              borderBottom: isActive
                ? "2px solid rgb(16 185 129)"
                : "2px solid transparent",
              marginBottom: "-1px",
              backgroundColor: "transparent",
              color: isActive
                ? "rgb(16 185 129)"
                : "var(--theme-ink-tertiary-color)",
              cursor: "pointer",
              transition: "color 100ms ease",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServicesFrame({ initialService = "cloud", onClose }: ServicesFrameProps) {
  const [activeTab, setActiveTab] = React.useState<ServiceSlug>(initialService)

  React.useEffect(() => {
    setActiveTab(initialService)
  }, [initialService])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "hsl(var(--theme-surface-panel))",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 0",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "10px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--theme-ink-tertiary-color)",
          }}
        >
          Services
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close services panel"
            style={{
              fontSize: "11px",
              color: "var(--theme-ink-tertiary-color)",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: "4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ padding: "8px 0 0", flexShrink: 0 }}>
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Section content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {activeTab === "cloud"   && <CloudSection />}
        {activeTab === "railway" && <RailwaySection />}
        {activeTab === "vercel"  && <VercelSection />}
        {activeTab === "github"  && <GitHubSection />}
      </div>
    </div>
  )
}
