"use client"

/**
 * HubFrame
 *
 * Central navigation surface — the "control tower" of the Keeper platform.
 * Surfaces all frames, boards, and legacy interfaces in one place so admins
 * and Kip can orient, migrate, and launch anything from a single screen.
 *
 * Route: /d/:slug?frame=hub
 *
 * Design intent:
 *  - Clean card grid, no sidebar
 *  - Cards grouped by category: Core Frames, Boards, Legacy Tools
 *  - Admin-only cards are clearly labelled and protected
 *  - Kip-accessible: each card has a machine-readable id for Kip to link to
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import type { StyleId } from "../../styles/styles"
import { StyleScope } from "../../styles/StyleScope"
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
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function DesignerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 17l4-1 9-9-3-3-9 9-1 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M13 4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function ThemeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 3v7l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function AgentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function MomentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 14V6a2 2 0 012-2h8a2 2 0 012 2v8l-3-2H6l-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function JourneyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 10c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 7v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function AdminIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2l2 5h5l-4 3 1.5 5L10 12l-4.5 3L7 10 3 7h5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function LegacyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// =============================================================================
// Badge
// =============================================================================

const BADGE_STYLES: Record<HubCardBadge, { bg: string; text: string; label: string }> = {
  admin:  { bg: "#fef2f2", text: "#dc2626", label: "Admin" },
  new:    { bg: "#f0fdf4", text: "#16a34a", label: "New" },
  legacy: { bg: "#fefce8", text: "#ca8a04", label: "Legacy" },
  beta:   { bg: "#eff6ff", text: "#2563eb", label: "Beta" },
}

function Badge({ type }: { type: HubCardBadge }) {
  const s = BADGE_STYLES[type]
  return (
    <span
      className="rounded text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

// =============================================================================
// Card
// =============================================================================

function HubCardItem({
  card,
  isAdmin,
}: {
  card: HubCard
  isAdmin: boolean
}) {
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
      className="group flex flex-col gap-3 rounded-xl p-5 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => {
        if (!isLocked) {
          e.currentTarget.style.borderColor = "#d1d5db"
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"
          e.currentTarget.style.transform = "translateY(-1px)"
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb"
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{
            width: 36,
            height: 36,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            color: "#374151",
          }}
        >
          {card.icon}
        </div>
        {card.badge && <Badge type={card.badge} />}
      </div>
      <div>
        <div className="text-[13px] font-semibold" style={{ color: "#111827" }}>
          {card.label}
        </div>
        <div className="mt-0.5 text-[12px] leading-relaxed" style={{ color: "#6b7280" }}>
          {card.description}
        </div>
      </div>
    </button>
  )
}

// =============================================================================
// Section
// =============================================================================

function HubSection({
  section,
  isAdmin,
}: {
  section: HubSection
  isAdmin: boolean
}) {
  const visible = isAdmin
    ? section.cards
    : section.cards.filter((c) => !c.adminOnly)

  if (visible.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "#9ca3af" }}
        >
          {section.label}
        </span>
        <div className="flex-1 h-px" style={{ background: "#f3f4f6" }} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((card) => (
          <HubCardItem key={card.id} card={card} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Main component
// =============================================================================

export function HubFrame({ styleId = "neutral", themeSlug }: HubFrameProps) {
  const { domainSlug, navigateToFrame, domainFrame } = useV0Shell()
  const { isAdmin } = useAuth()

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
          description: "Browse all captured moments in this domain",
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
          description: "Domain settings, profile, and governance",
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
          description: "Edit frame JSON, preview, and configure Kip",
          href: `/d/${domainSlug}?board=designer`,
          icon: <DesignerIcon />,
          badge: "admin",
          adminOnly: true,
        },
        {
          id: "theme",
          label: "Theme Editor",
          description: "Edit colors, fonts, wordmark, and tagline",
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
          description: "Original management board — pending migration",
          href: "/studio",
          icon: <LegacyIcon />,
          badge: "legacy",
          adminOnly: true,
        },
        {
          id: "studio-agents",
          label: "Agents",
          description: "Agent configuration (legacy studio)",
          href: "/studio/agents",
          icon: <AgentIcon />,
          badge: "legacy",
          adminOnly: true,
        },
        {
          id: "keeper",
          label: "Keeper Manager",
          description: "Manage keepers (legacy studio)",
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

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug}>
      <div className="flex flex-col min-h-screen" style={{ background: "#f9fafb" }}>

        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-6"
          style={{
            height: 56,
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToFrame("cover")}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-gray-100"
              style={{ color: "#374151" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {wordmark}
            </button>
            <div className="h-4 w-px" style={{ background: "#e5e7eb" }} />
            <span className="text-[13px] font-semibold" style={{ color: "#111827" }}>Hub</span>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigateToFrame("theme")}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-gray-100"
              style={{ color: "#6b7280" }}
            >
              <ThemeIcon />
              Theme
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">

            {/* Page title */}
            <div className="mb-8">
              <h1
                className="text-2xl font-bold"
                style={{ color: "#111827" }}
              >
                Platform Hub
              </h1>
              <p className="mt-1 text-[13px]" style={{ color: "#6b7280" }}>
                All frames, boards, and tools for <span className="font-medium" style={{ color: "#374151" }}>{domainSlug}</span>
              </p>
            </div>

            {/* Sections */}
            <div className="flex flex-col gap-10">
              {sections.map((section) => (
                <HubSection
                  key={section.id}
                  section={section}
                  isAdmin={!!isAdmin}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </StyleScope>
  )
}
