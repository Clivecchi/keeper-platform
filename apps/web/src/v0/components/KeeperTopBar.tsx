"use client"

import * as React from "react"
import clsx from "clsx"
import { FileText } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useV0Shell } from "../shell/V0ShellContext"
import { useAuth } from "../../context/AuthContext"

// ─── Profile Popover ──────────────────────────────────────────────────────────

interface ProfilePopoverProps {
  displayName: string
  roleLabel: string
  onSignOut: () => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

function ProfilePopover({ displayName, roleLabel, onSignOut, onClose, anchorRef }: ProfilePopoverProps) {
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null)

  React.useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        anchorRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) return
      onClose()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [anchorRef, onClose])

  return (
    <div
      ref={popoverRef}
      role="menu"
      aria-label="Profile menu"
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        right: 0,
        width: 180,
        zIndex: 50,
        backgroundColor: "var(--color-background-primary, hsl(var(--theme-surface-paper)))",
        border: "0.5px solid var(--theme-border-soft)",
        borderRadius: "var(--border-radius-lg, 8px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Identity block */}
      <div className="px-3 py-3">
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            lineHeight: "1.25",
            color: "var(--theme-ink-primary)",
          }}
        >
          {displayName}
        </p>
        <p
          style={{
            fontSize: 11,
            lineHeight: "1.25",
            marginTop: 3,
            color: "var(--theme-ink-muted, var(--theme-ink-secondary))",
          }}
        >
          {roleLabel}
        </p>
      </div>

      {/* Hairline divider */}
      <div style={{ height: "0.5px", backgroundColor: "var(--theme-border-soft)" }} aria-hidden />

      {/* Menu items — add Profile, Settings, etc. as additional <li> entries */}
      <ul role="none" style={{ margin: 0, padding: "4px 0", listStyle: "none" }}>
        <li role="none">
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            onMouseEnter={() => setHoveredItem("sign-out")}
            onMouseLeave={() => setHoveredItem(null)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "7px 12px",
              fontSize: 12,
              border: "none",
              cursor: "pointer",
              color: "var(--theme-ink-primary)",
              backgroundColor:
                hoveredItem === "sign-out"
                  ? "var(--color-background-secondary, hsl(var(--theme-surface-raised, var(--theme-surface-paper)) / 1))"
                  : "transparent",
            }}
          >
            Sign out
          </button>
        </li>
      </ul>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TopBarBoardId = "domain" | "ide" | "designer" | "agent"

interface KeeperTopBarProps {
  onDomainClick: () => void
  onBriefClick: () => void
  isBriefOpen?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }
  if (email?.trim()) return email[0].toUpperCase()
  return "?"
}

function getRoleLabel(audience: string | null): string {
  if (audience === "admin") return "Admin"
  if (audience === "keeper") return "Keeper"
  return "Guest"
}

// ─── Board nav config ─────────────────────────────────────────────────────────

const BOARD_LINKS: { id: TopBarBoardId; label: string }[] = [
  { id: "domain",   label: "Domain" },
  { id: "ide",      label: "IDE" },
  { id: "designer", label: "Design" },
  { id: "agent",    label: "Agent" },
]

// Mirrors the navigateBoard() logic in DomainBoard.tsx lines 290–300.
function boardUrl(id: TopBarBoardId, domainSlug: string): string {
  const encoded = encodeURIComponent(domainSlug)
  if (id === "domain")   return `/d/${encoded}?board=domain`
  if (id === "ide")      return `/d/${encoded}?board=ide`
  if (id === "designer") return `/d/${encoded}?board=designer`
  return `/d/${encoded}?board=agent`
}

// Derive the active board ID from search params.
function resolveActiveBoardId(searchParams: URLSearchParams): TopBarBoardId | null {
  const board = searchParams.get("board")?.toLowerCase()
  if (board === "domain")   return "domain"
  if (board === "ide")      return "ide"
  if (board === "designer") return "designer"
  if (board === "agent")    return "agent"
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KeeperTopBar({ onDomainClick, onBriefClick, isBriefOpen }: KeeperTopBarProps) {
  const { domainSlug, domainFrame, resolvedAudience } = useV0Shell()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [profileOpen, setProfileOpen] = React.useState(false)
  const avatarButtonRef = React.useRef<HTMLButtonElement>(null)

  // ── Data ──
  const wordmark = domainFrame?.theme?.wordmark?.trim() || domainSlug
  const tagline = (() => {
    const card = domainFrame?.cover?.card as { tagLine?: string } | undefined
    return card?.tagLine?.trim() || domainFrame?.theme?.tagline?.trim() || ""
  })()

  const initials = getInitials(user?.name ?? null, user?.email ?? null)
  const displayName = user?.name?.trim() || user?.email?.trim() || "Guest"
  const roleLabel = getRoleLabel(resolvedAudience)

  const activeBoardId = resolveActiveBoardId(searchParams)

  const handleBoardClick = (id: TopBarBoardId) => {
    navigate(boardUrl(id, domainSlug))
  }

  const handleAvatarClick = () => {
    if (resolvedAudience === "guest") return
    setProfileOpen((prev) => !prev)
  }

  const handleSignOut = () => {
    setProfileOpen(false)
    logout()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="keeper-platform-top-bar"
    >
      {/* Row 1: domain identity + user */}
      <div
        className="keeper-topbar-row flex items-center justify-between px-5"
        style={{
          height: 40,
          borderBottom: "0.5px solid hsla(38, 20%, 22%, 0.25)",
        }}
      >
        {/* Left: domain name + tagline */}
        <button
          type="button"
          onClick={onDomainClick}
          className="flex flex-col items-start min-w-0 text-left"
          aria-label={`Domain: ${wordmark}`}
        >
          <span
            className="keeper-topbar-primary font-serif text-[15px] font-semibold leading-tight truncate max-w-[280px]"
          >
            {wordmark}
          </span>
          {tagline ? (
            <span
              className="keeper-topbar-secondary text-[11px] leading-none truncate max-w-[280px] mt-0.5"
            >
              {tagline}
            </span>
          ) : null}
        </button>

        {/* Right: user name, role, avatar */}
        <div className="flex items-center gap-2.5 shrink-0" style={{ position: "relative" }}>
          <div className="text-right">
            <p
              className="keeper-topbar-primary text-[12px] font-medium leading-tight"
            >
              {displayName}
            </p>
            <p className="mt-0.5">
              <span className="keeper-topbar-status-badge">{roleLabel}</span>
            </p>
          </div>
          {/* Avatar circle — clickable for authenticated users */}
          <button
            ref={avatarButtonRef}
            type="button"
            onClick={handleAvatarClick}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            className="keeper-topbar-secondary flex items-center justify-center rounded-full shrink-0 text-[11px] font-semibold"
            style={{
              width: 26,
              height: 26,
              backgroundColor: "hsla(35, 12%, 16%, 0.55)",
              border: profileOpen
                ? "1px solid hsl(var(--theme-header-sole-border) / 0.45)"
                : "1px solid hsla(38, 18%, 28%, 0.3)",
              cursor: resolvedAudience === "guest" ? "default" : "pointer",
              padding: 0,
            }}
          >
            {initials}
          </button>

          {/* Profile popover */}
          {profileOpen && resolvedAudience !== "guest" && (
            <ProfilePopover
              displayName={displayName}
              roleLabel={roleLabel}
              onSignOut={handleSignOut}
              onClose={() => setProfileOpen(false)}
              anchorRef={avatarButtonRef}
            />
          )}
        </div>
      </div>

      {/* Row 2: board links + Brief */}
      <div
        className="keeper-topbar-row flex items-center justify-between px-5"
        style={{
          height: 32,
          borderBottom: "0.5px solid hsla(38, 20%, 22%, 0.25)",
        }}
      >
        {/* Board links */}
        <nav className="flex items-center gap-0" aria-label="Board navigation">
          {BOARD_LINKS.map(({ id, label }, idx) => {
            const isActive = activeBoardId === id
            return (
              <React.Fragment key={id}>
                {idx > 0 && (
                  <span
                    className="keeper-topbar-secondary select-none px-1.5 text-[12px]"
                    aria-hidden
                  >
                    ·
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleBoardClick(id)}
                  className={clsx(
                    "text-[12px] transition-colors",
                    isActive ? "keeper-topbar-primary font-medium" : "keeper-topbar-secondary",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </button>
              </React.Fragment>
            )
          })}
        </nav>

        {/* Brief button */}
        <button
          type="button"
          onClick={onBriefClick}
          className={clsx(
            "flex items-center gap-1 transition-colors text-[12px]",
            isBriefOpen ? "keeper-topbar-primary font-medium" : "keeper-topbar-secondary",
          )}
          aria-label="Open domain brief"
          aria-pressed={isBriefOpen}
        >
          <FileText className="shrink-0" style={{ width: 13, height: 13 }} strokeWidth={isBriefOpen ? 2 : 1.75} aria-hidden />
          <span className="text-[12px]">Brief</span>
        </button>
      </div>
    </div>
  )
}
