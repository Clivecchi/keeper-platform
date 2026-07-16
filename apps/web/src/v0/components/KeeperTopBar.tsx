"use client"

import * as React from "react"
import clsx from "clsx"
import { FileText } from "lucide-react"
import { useV0Shell } from "../shell/V0ShellContext"
import type { WorkspaceBoardId } from "../boards/workspaceBoardNav"
import { resolveWorkspaceBoardLinks } from "../boards/domainWorkspaceBoards"
import { useAuth } from "../../context/AuthContext"
import { PlaybillHeaderCard } from "./PlaybillHeaderCard"
import { PLAYBILL_ANCHOR_MAX_WIDTH } from "../boards/domain/domainSwitcherTheme"
import {
  fetchDomainSwitcherEntries,
  getCachedDomainSwitcherEntries,
  prefetchDomainSwitcherEntries,
} from "../boards/domain/domainSwitcherData"
import { getBlobProxyUrl } from "../../lib/blobProxy"

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
      <div className="px-3 py-3">
        <p className="keeper-topbar-popover-name truncate">{displayName}</p>
        <p className="keeper-topbar-popover-role">{roleLabel}</p>
      </div>
      <div className="keeper-topbar-popover-divider" aria-hidden />
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

interface KeeperTopBarProps {
  onDomainClick: () => void
  onGoHome: () => void
  onBriefClick: () => void
  isBriefOpen?: boolean
  isPlaybillOpen?: boolean
  playbillDropdown?: React.ReactNode
}

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

function useDomainIdForSlug(slug: string): string {
  const [domainId, setDomainId] = React.useState("")

  React.useEffect(() => {
    if (!slug.trim()) {
      setDomainId("")
      return
    }

    const resolve = (entries: { id: string; slug: string }[]) => {
      const match = entries.find(
        (entry) => entry.slug.trim().toLowerCase() === slug.trim().toLowerCase(),
      )
      setDomainId(match?.id ?? "")
    }

    const cached = getCachedDomainSwitcherEntries()
    if (cached) {
      resolve(cached)
      return
    }

    prefetchDomainSwitcherEntries()
    void fetchDomainSwitcherEntries().then(resolve).catch(() => setDomainId(""))
  }, [slug])

  return domainId
}

function UserAvatar({
  avatarUrl,
  initials,
  isOpen,
  isGuest,
}: {
  avatarUrl: string | null
  initials: string
  isOpen: boolean
  isGuest: boolean
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="keeper-topbar-avatar keeper-topbar-avatar-image"
        data-open={isOpen ? "true" : "false"}
        data-guest={isGuest ? "true" : "false"}
        draggable={false}
      />
    )
  }

  return (
    <span
      className="keeper-topbar-avatar"
      data-open={isOpen ? "true" : "false"}
      data-guest={isGuest ? "true" : "false"}
      aria-hidden
    >
      {initials}
    </span>
  )
}

export function KeeperTopBar({
  onDomainClick,
  onGoHome,
  onBriefClick,
  isBriefOpen,
  isPlaybillOpen = false,
  playbillDropdown,
}: KeeperTopBarProps) {
  const {
    domainSlug,
    domainFrame,
    domainData,
    resolvedAudience,
    workspaceBoardId,
    switchWorkspace,
    shellMode,
  } = useV0Shell()
  const { user, logout } = useAuth()
  const [profileOpen, setProfileOpen] = React.useState(false)
  const avatarButtonRef = React.useRef<HTMLButtonElement>(null)

  const isHomeShell = shellMode === "home"
  const domainId = useDomainIdForSlug(domainSlug)
  const domainName =
    domainFrame?.theme?.wordmark?.trim() ||
    (typeof domainData?.name === "string" ? domainData.name.trim() : "") ||
    (typeof domainData?.displayName === "string" ? domainData.displayName.trim() : "") ||
    ""
  const coverImageUrl = domainData?.theme?.coverImage
    ? getBlobProxyUrl(domainData.theme.coverImage)
    : null

  const initials = getInitials(user?.name ?? null, user?.email ?? null)
  const displayName = user?.name?.trim() || user?.email?.trim() || "Guest"
  const roleLabel = getRoleLabel(resolvedAudience)
  const avatarUrl = user?.avatar_url?.trim() ? getBlobProxyUrl(user.avatar_url.trim()) : null
  const isGuest = resolvedAudience === "guest"

  const boardLinks = React.useMemo(
    () => (isHomeShell ? [] : resolveWorkspaceBoardLinks(domainSlug)),
    [domainSlug, isHomeShell],
  )

  const handleBoardClick = (id: WorkspaceBoardId) => {
    switchWorkspace(id)
  }

  const handleUserClick = () => {
    if (isGuest) return
    if (!isHomeShell) return
    setProfileOpen((prev) => !prev)
  }

  const handleSignOut = () => {
    setProfileOpen(false)
    logout()
  }

  const leadAgentSlug = domainData?.leadAgentSlug?.trim() || null

  return (
    <div className="keeper-platform-top-bar relative z-50 shrink-0">
      <div className="keeper-topbar-identity-row">
        <div
          className="keeper-topbar-playbill-anchor"
          style={{ maxWidth: PLAYBILL_ANCHOR_MAX_WIDTH }}
        >
          <PlaybillHeaderCard
            domainSlug={domainSlug}
            domainId={domainId}
            domainName={domainName}
            coverImageUrl={coverImageUrl}
            domainFrame={domainFrame}
            domainLead={domainData}
            leadAgentSlug={leadAgentSlug}
            leadAgentName={
              typeof domainData?.leadAgentName === "string" ? domainData.leadAgentName : null
            }
            onOpenPlaybill={onDomainClick}
            onGoHome={onGoHome}
            isOpen={isPlaybillOpen}
          />
          {isPlaybillOpen ? playbillDropdown : null}
        </div>

        <div className="keeper-topbar-user">
          {!isGuest && isHomeShell ? (
            <button
              type="button"
              onClick={handleUserClick}
              className="keeper-topbar-user-meta text-right transition-opacity cursor-pointer hover:opacity-90"
              aria-label="Open profile menu"
            >
              <p className="keeper-topbar-primary keeper-topbar-user-name font-medium truncate">
                {displayName}
              </p>
              <span className="keeper-topbar-status-badge">{roleLabel}</span>
            </button>
          ) : null}
          <button
            ref={avatarButtonRef}
            type="button"
            onClick={handleUserClick}
            aria-expanded={profileOpen}
            aria-haspopup={isHomeShell ? "menu" : undefined}
            aria-label={isHomeShell ? "Open profile menu" : displayName}
            className="keeper-topbar-avatar-button"
          >
            <UserAvatar
              avatarUrl={avatarUrl}
              initials={initials}
              isOpen={profileOpen}
              isGuest={isGuest}
            />
          </button>
          {profileOpen && !isGuest && isHomeShell && (
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

      <div className="keeper-topbar-nav-row">
        <nav className="flex items-center gap-0.5" aria-label="Board navigation">
          {boardLinks.map(({ id, label }, idx) => {
            const isActive = workspaceBoardId === id
            return (
              <React.Fragment key={id}>
                {(idx > 0) && (
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

        {!isHomeShell ? (
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
        ) : null}
      </div>
    </div>
  )
}
