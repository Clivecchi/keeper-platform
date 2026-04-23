"use client"

import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceSlug = "cloud" | "railway" | "vercel" | "github"

export interface ServicesFrameProps {
  initialService?: ServiceSlug
  onClose?: () => void
}

// ─── Tab config ───────────────────────────────────────────────────────────────

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
      <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#e6edf3", marginBottom: "10px" }}>
        Cloud
      </h2>
      <p style={{ fontSize: "12px", lineHeight: "1.6", color: "#8b949e", marginBottom: "16px" }}>
        Cloud is Kip&apos;s technical subagent. It has access to the codebase, Railway, Vercel, and GitHub. Invoke Cloud through Kip in the conversation.
      </p>
      <StatusRow label="Agent" value="Registered" detail="claude-sonnet-4-6" valueColor="#3fb950" />
    </div>
  )
}

function RailwaySection() {
  return (
    <div style={{ padding: "20px 20px 24px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#e6edf3", marginBottom: "10px" }}>
        Railway
      </h2>
      <p style={{ fontSize: "12px", lineHeight: "1.6", color: "#8b949e", marginBottom: "16px" }}>
        Connect Railway to enable backend deployment from the IDE Board.
      </p>
      <StatusRow label="Status" value="Not connected" valueColor="#484f58" />
      <div style={{ marginTop: "16px" }}>
        <ConnectButton
          label="Connect Railway"
          onClick={() => {
            // TODO: Railway OAuth
          }}
        />
      </div>
    </div>
  )
}

function VercelSection() {
  return (
    <div style={{ padding: "20px 20px 24px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#e6edf3", marginBottom: "10px" }}>
        Vercel
      </h2>
      <p style={{ fontSize: "12px", lineHeight: "1.6", color: "#8b949e", marginBottom: "16px" }}>
        Connect Vercel to enable frontend deployment and preview URLs from the IDE Board.
      </p>
      <StatusRow label="Status" value="Not connected" valueColor="#484f58" />
      <div style={{ marginTop: "16px" }}>
        <ConnectButton
          label="Connect Vercel"
          onClick={() => {
            // TODO: Vercel OAuth
          }}
        />
      </div>
    </div>
  )
}

function GitHubSection() {
  return (
    <div style={{ padding: "20px 20px 24px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#e6edf3", marginBottom: "10px" }}>
        GitHub
      </h2>
      <p style={{ fontSize: "12px", lineHeight: "1.6", color: "#8b949e", marginBottom: "16px" }}>
        Connect GitHub to surface branch status, commits, and pull requests from the IDE Board.
      </p>
      <StatusRow label="Status" value="Not connected" valueColor="#484f58" />
      <div style={{ marginTop: "16px" }}>
        <ConnectButton
          label="Connect GitHub"
          onClick={() => {
            // TODO: GitHub OAuth
          }}
        />
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatusRow({
  label,
  value,
  detail,
  valueColor = "#8b949e",
}: {
  label: string
  value: string
  detail?: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#484f58",
        padding: "6px 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span style={{ minWidth: "52px" }}>{label}</span>
      <span style={{ color: "#484f58", marginRight: "4px" }}>·</span>
      <span style={{ color: valueColor }}>{value}</span>
      {detail && (
        <>
          <span style={{ color: "#484f58" }}>·</span>
          <span style={{ color: "#484f58" }}>{detail}</span>
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
        fontFamily: "monospace",
        fontSize: "11px",
        padding: "5px 14px",
        border: "1px solid #6ee7b7",
        borderRadius: "6px",
        color: "#6ee7b7",
        backgroundColor: hovered ? "rgba(110,231,183,0.08)" : "transparent",
        cursor: "pointer",
        transition: "background-color 80ms ease",
      }}
    >
      {label}
    </button>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: ServiceSlug
  onChange: (slug: ServiceSlug) => void
}) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "#161b22",
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
              fontFamily: "monospace",
              fontSize: "11px",
              padding: "8px 14px",
              border: "none",
              borderBottom: isActive ? "2px solid #6ee7b7" : "2px solid transparent",
              marginBottom: "-1px",
              backgroundColor: "transparent",
              color: isActive ? "#6ee7b7" : "#484f58",
              cursor: "pointer",
              transition: "color 80ms ease",
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
        backgroundColor: "#1c2128",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px 0",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#484f58",
          }}
        >
          Integrated Services
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close services panel"
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              color: "#484f58",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "3px",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ paddingTop: "8px", flexShrink: 0 }}>
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
