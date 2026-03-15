"use client"

/**
 * HubFrame
 *
 * Central navigation surface — the "control tower" of the Keeper platform.
 * Surfaces all frames, boards, and legacy interfaces in one place.
 *
 * Uses DesignFrame for consistent platform chrome:
 *   - Domain cover image as background
 *   - Standard sticky header
 *   - Margin interaction bar at the bottom
 *
 * Route: /d/:slug?frame=hub
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useAuth } from "../../../context/AuthContext"

// =============================================================================
// Types
// =============================================================================

interface HubFrameProps {
  styleId?: StyleId
  themeSlug?: string | null
  domainSlug?: string
}

type HubCardBadge = "admin" | "new" | "legacy" | "beta"

interface HubCard {
  id: string
  label: string
  description: string
  href: string
  badge?: HubCardBadge
  icon: React.ReactNode
  adminOnly?: boolean
}

interface HubSection {
  id: string
  label: string
  cards: HubCard[]
}

// =============================================================================
// Icons
// =============================================================================

function FrameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 6.5h8M5 9h8M5 11.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function DesignerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 15l3.5-1 8-8-2.5-2.5-8 8-1 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 3l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function ThemeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 2.5v6.5l3.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function AgentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2.5 15.5c0-3.038 2.91-5.5 6.5-5.5s6.5 2.462 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function MomentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3.5 13V5.5a2 2 0 012-2h7a2 2 0 012 2V13l-2.5-1.5H6L3.5 13z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function JourneyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 9a6 6 0 1012 0A6 6 0 003 9z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 6.5v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function AdminIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5l1.75 4.5h4.5L12 8.5l1.25 4.25L9 10.25l-4.25 2.5L6 8.5 2.75 6h4.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function LegacyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2.5" y="3.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// =============================================================================
// Badge
// =============================================================================

const BADGE_CFG: Record<HubCardBadge, { label: string; style: React.CSSProperties }> = {
  admin:  { label: "Admin",  style: { background: "hsl(var(--theme-surface-page))", color: "var(--theme-ink-secondary)", border: "1px solid var(--theme-border-soft)" } },
  new:    { label: "New",    style: { background: "hsl(var(--theme-surface-page))", color: "var(--theme-ink-secondary)", border: "1px solid var(--theme-border-soft)" } },
  legacy: { label: "Legacy", style: { background: "hsl(var(--theme-surface-page))", color: "var(--theme-ink-tertiary)",  border: "1px solid var(--theme-border-soft)" } },
  beta:   { label: "Beta",   style: { background: "hsl(var(--theme-surface-page))", color: "var(--theme-ink-secondary)", border: "1px solid var(--theme-border-soft)" } },
}

function Badge({ type }: { type: HubCardBadge }) {
  const { label, style } = BADGE_CFG[type]
  return (
    <span className="rounded text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5" style={style}>
      {label}
    </span>
  )
}

// =============================================================================
// Card
// =============================================================================

function HubCardItem({ card, isAdmin }: { card: HubCard; isAdmin: boolean }) {
  const navigate = useNavigate()
  const isLocked = card.adminOnly && !isAdmin

  const handleClick = () => {
    if (isLocked) return
    if (card.href.startsWith("http")) {
      window.location.href = card.href
    } else {
      navigate(card.href)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLocked}
      className="group flex flex-col gap-3 rounded-2xl p-4 text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        background: "hsl(var(--theme-surface-paper) / 0.7)",
        border: "1px solid var(--theme-border-soft)",
        backdropFilter: "blur(8px)",
      }}
      onMouseEnter={(e) => {
        if (!isLocked) {
          e.currentTarget.style.background = "hsl(var(--theme-surface-paper) / 0.9)"
          e.currentTarget.style.transform = "translateY(-1px)"
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "hsl(var(--theme-surface-paper) / 0.7)"
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: 34,
            height: 34,
            background: "hsl(var(--theme-surface-page) / 0.6)",
            border: "1px solid var(--theme-border-soft)",
            color: "var(--theme-ink-secondary)",
          }}
        >
          {card.icon}
        </div>
        {card.badge && <Badge type={card.badge} />}
      </div>
      <div>
        <div className="text-[13px] font-semibold" style={{ color: "var(--theme-ink-primary)" }}>
          {card.label}
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed" style={{ color: "var(--theme-ink-tertiary)" }}>
          {card.description}
        </div>
      </div>
    </button>
  )
}

// =============================================================================
// Main component
// =============================================================================

export function HubFrame({ styleId = "neutral", themeSlug, domainSlug: propSlug }: HubFrameProps) {
  const { domainSlug: ctxSlug, domainFrame } = useV0Shell()
  const { isAdmin } = useAuth()
  const domainSlug = propSlug ?? ctxSlug ?? ""
  const wordmark = domainFrame?.theme?.wordmark || domainSlug || "Keeper"

  const sections: HubSection[] = [
    {
      id: "frames",
      label: "Core Frames",
      cards: [
        {
          id: "cover",
          label: "Cover",
          description: "Domain landing page shown to all visitors",
          href: `/d/${domainSlug}?frame=cover`,
          icon: <FrameIcon />,
        },
        {
          id: "commons",
          label: "Commons",
          description: "Workspace hub for authenticated keepers",
          href: `/d/${domainSlug}?frame=commons`,
          icon: <AgentIcon />,
        },
        {
          id: "agent",
          label: "Agent Board",
          description: "Full conversation and drafting workspace",
          href: `/d/${domainSlug}?frame=agent`,
          icon: <AgentIcon />,
        },
        {
          id: "moment",
          label: "Moment",
          description: "Capture and keep a single moment",
          href: `/d/${domainSlug}?frame=moment`,
          icon: <MomentIcon />,
        },
        {
          id: "moments",
          label: "Kept Moments",
          description: "Browse all captured moments",
          href: `/d/${domainSlug}?frame=moments`,
          icon: <MomentIcon />,
        },
        {
          id: "journeys",
          label: "Journeys",
          description: "View and manage journeys",
          href: `/d/${domainSlug}?frame=journeys`,
          icon: <JourneyIcon />,
        },
        {
          id: "index",
          label: "Index",
          description: "Domain content index",
          href: `/d/${domainSlug}?frame=index`,
          icon: <FrameIcon />,
        },
        {
          id: "admin",
          label: "Domain Admin",
          description: "Domain settings and governance",
          href: `/d/${domainSlug}?frame=admin`,
          icon: <AdminIcon />,
          badge: "admin",
          adminOnly: true,
        },
        {
          id: "diagnostics",
          label: "Diagnostics",
          description: "System health and debug tools",
          href: `/d/${domainSlug}?frame=diagnostics`,
          icon: <AdminIcon />,
          badge: "admin",
          adminOnly: true,
        },
      ],
    },
    {
      id: "design",
      label: "Design & Configuration",
      cards: [
        {
          id: "designer",
          label: "Designer Board",
          description: "Edit frame JSON, preview, configure Kip",
          href: `/d/${domainSlug}?board=designer`,
          icon: <DesignerIcon />,
          badge: "admin",
          adminOnly: true,
        },
        {
          id: "theme",
          label: "Theme Editor",
          description: "Colors, fonts, wordmark, tagline",
          href: `/d/${domainSlug}?frame=theme`,
          icon: <ThemeIcon />,
          badge: "admin",
          adminOnly: true,
        },
      ],
    },
    {
      id: "legacy",
      label: "Legacy Interfaces",
      cards: [
        {
          id: "studio",
          label: "Studio",
          description: "Original management board",
          href: "/studio",
          icon: <LegacyIcon />,
          badge: "legacy",
          adminOnly: true,
        },
        {
          id: "studio-agents",
          label: "Agents",
          description: "Agent configuration (legacy)",
          href: "/studio/agents",
          icon: <AgentIcon />,
          badge: "legacy",
          adminOnly: true,
        },
        {
          id: "keeper",
          label: "Keeper Manager",
          description: "Manage keepers (legacy)",
          href: "/keeper",
          icon: <AgentIcon />,
          badge: "legacy",
          adminOnly: true,
        },
        {
          id: "admin-domains",
          label: "Domain Admin (Legacy)",
          description: "Platform-level domain management",
          href: "/admin/domains",
          icon: <AdminIcon />,
          badge: "legacy",
          adminOnly: true,
        },
      ],
    },
  ]

  const visibleSections = sections.map((s) => ({
    ...s,
    cards: isAdmin ? s.cards : s.cards.filter((c) => !c.adminOnly),
  })).filter((s) => s.cards.length > 0)

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title={`${wordmark} Hub`}
      subtitle="All frames, boards, and tools in one place"
    >
      <div className="flex flex-col gap-10">
        {visibleSections.map((section) => (
          <div key={section.id}>
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--theme-ink-tertiary)" }}
              >
                {section.label}
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--theme-border-soft)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {section.cards.map((card) => (
                <HubCardItem key={card.id} card={card} isAdmin={!!isAdmin} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </DesignFrame>
  )
}
