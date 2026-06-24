"use client"

import * as React from "react"
import clsx from "clsx"
import { FileText } from "lucide-react"
import { useV0Shell } from "../shell/V0ShellContext"
import type { WorkspaceBoardId } from "../boards/workspaceBoardNav"
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
      className="keeper-topbar-popover"
    >
      {/* Identity block */}
      <div className="px-3 py-3">
        <p className="keeper-topbar-popover-name truncate">{displayName}</p>
        <p className="keeper-topbar-popover-role">{roleLabel}</p>
      </div>

      {/* Hairline divider */}
      <div className="keeper-topbar-popover-divider" aria-hidden />

      {/* Menu items — add Profile, Settings, etc. as additional <li> entries */}
      <ul role="none" style={{ margin: 0, padding: "4px 0", listStyle: "none" }}>
        <li role="none">
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="keeper-topbar-popover-item"
          >
            Sign out
          </button>
        </li>
      </ul>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

const BOARD_LINKS: { id: WorkspaceBoardId; label: string }[] = [
  { id: "domain",   label: "Domain" },
  { id: "ide",      label: "IDE" },
  { id: "designer", label: "Design" },
  { id: "agent",    label: "Agent" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function KeeperTopBar({ onDomainClick, onBriefClick, isBriefOpen }: KeeperTopBarProps) {
  const {
    domainSlug,
    domainFrame,
    resolvedAudience,
    workspaceBoardId,
    switchWorkspace,
  } = useV0Shell()
  const { user, logout } = useAuth()
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

  const activeBoardId = workspaceBoardId

  const handleBoardClick = (id: WorkspaceBoardId) => {
    switchWorkspace(id)
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
      className="keeper-platform-top-bar relative z-50 shrink-0"
    >
      {/* Row 1: domain identity + user */}
      <div className="keeper-topbar-identity-row">
        {/* Left: domain name + tagline */}
        <button
          type="button"
          onClick={onDomainClick}
          className="keeper-topbar-identity"
          aria-label={`Domain: ${wordmark}`}
        >
          <span
            className="keeper-topbar-primary keeper-topbar-wordmark font-serif font-semibold truncate max-w-[320px]"
          >
            {wordmark}
          </span>
          {tagline ? (
            <span
              className="keeper-topbar-tagline text-[12px] leading-snug truncate max-w-[320px]"
            >
              {tagline}
            </span>
          ) : null}
        </button>

        {/* Right: user name, role, avatar — vertically centered as one unit */}
        <div className="keeper-topbar-user">
          <div className="keeper-topbar-user-meta">
            <p
              className="keeper-topbar-primary keeper-topbar-user-name font-medium truncate"
              title={displayName}
            >
              {displayName}
            </p>
            <span className="keeper-topbar-status-badge">{roleLabel}</span>
          </div>
          <button
            ref={avatarButtonRef}
            type="button"
            onClick={handleAvatarClick}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            className="keeper-topbar-secondary keeper-topbar-avatar"
            data-open={profileOpen ? "true" : "false"}
            data-guest={resolvedAudience === "guest" ? "true" : "false"}
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
      <div className="keeper-topbar-nav-row">
        {/* Board links */}
        <nav className="flex items-center gap-0.5" aria-label="Board navigation">
          {BOARD_LINKS.map(({ id, label }, idx) => {
            const isActive = activeBoardId === id
            return (
              <React.Fragment key={id}>
                {idx > 0 && (
                  <span
                    className="keeper-topbar-secondary select-none px-1.5 text-[13px]"
                    aria-hidden
                  >
                    ·
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleBoardClick(id)}
                  className={clsx(
                    "text-[13px] transition-colors py-0.5",
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
            "flex items-center gap-1.5 transition-colors text-[13px] py-0.5",
            isBriefOpen ? "keeper-topbar-primary font-medium" : "keeper-topbar-secondary",
          )}
          aria-label="Open domain brief"
          aria-pressed={isBriefOpen}
        >
          <FileText className="shrink-0" style={{ width: 14, height: 14 }} strokeWidth={isBriefOpen ? 2 : 1.75} aria-hidden />
          <span className="text-[13px]">Brief</span>
        </button>
      </div>
    </div>
  )
}
