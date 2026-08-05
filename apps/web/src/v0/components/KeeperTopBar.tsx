"use client"

import * as React from "react"
import clsx from "clsx"
import { BookOpen, FileText } from "lucide-react"
import { useV0Shell } from "../shell/V0ShellContext"
import type { WorkspaceBoardId } from "../boards/workspaceBoardNav"
import { resolveWorkspaceBoardLinks } from "../boards/domainWorkspaceBoards"
import { useAuth } from "../../context/AuthContext"
import { PlaybillHeaderCard } from "./PlaybillHeaderCard"
import {
  PLAYBILL_ANCHOR_MAX_WIDTH,
  PLAYBILL_ANCHOR_MAX_WIDTH_MOBILE,
} from "../boards/domain/domainSwitcherTheme"
import { useIsMobile } from "../../mobile/hooks/useIsMobile"
import {
  fetchDomainSwitcherEntries,
  getCachedDomainSwitcherEntries,
  prefetchDomainSwitcherEntries,
} from "../boards/domain/domainSwitcherData"
import { extractDomainThemeCover } from "@keeper/shared"
import { getBlobProxyUrl } from "../../lib/blobProxy"
import { resolveDomainCoverUrl } from "../boards/domain/domainShellCache"

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
  /** Adaptive mobile — opens Nav drawer (replaces Nav bottom tab). */
  onOpenNav?: () => void
  /** Fold Dialog domain LIVE into Playbill (one identity bar). */
  showLivePulse?: boolean
  livePulseColor?: string
  dialogTitle?: string | null
  dialogUnread?: boolean
  onOpenChronicle?: () => void
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
  onOpenNav,
  showLivePulse = false,
  livePulseColor,
  dialogTitle,
  dialogUnread,
  onOpenChronicle,
}: KeeperTopBarProps) {
  const {
    domainSlug,
    domainFrame,
    domainData,
    resolvedAudience,
    workspaceBoardId,
    switchWorkspace,
  } = useV0Shell()
  const { user, logout } = useAuth()
  const isMobile = useIsMobile()
  const [profileOpen, setProfileOpen] = React.useState(false)
  const avatarButtonRef = React.useRef<HTMLButtonElement>(null)

  const domainId = useDomainIdForSlug(domainSlug)
  const domainName =
    domainFrame?.theme?.wordmark?.trim() ||
    (typeof domainData?.name === "string" ? domainData.name.trim() : "") ||
    (typeof domainData?.displayName === "string" ? domainData.displayName.trim() : "") ||
    ""
  // Atmosphere/cover is domain-shell only — never borrow another domain's theme during soft-switch.
  const coverImageUrl = (() => {
    const shellSlug =
      typeof domainData?.slug === "string" ? domainData.slug.trim().toLowerCase() : ""
    const currentSlug = domainSlug?.trim().toLowerCase() ?? ""
    if (shellSlug && currentSlug && shellSlug === currentSlug) {
      const fromTheme = extractDomainThemeCover(domainData?.theme).coverImage?.trim()
      if (fromTheme) return getBlobProxyUrl(fromTheme)
    }
    return domainSlug ? resolveDomainCoverUrl(domainSlug) : null
  })()

  const initials = getInitials(user?.name ?? null, user?.email ?? null)
  const displayName = user?.name?.trim() || user?.email?.trim() || "Guest"
  const roleLabel = getRoleLabel(resolvedAudience)
  const avatarUrl = user?.avatar_url?.trim() ? getBlobProxyUrl(user.avatar_url.trim()) : null
  const isGuest = resolvedAudience === "guest"

  // Keep Realm · Domain · Agent (etc.) on `/home` so members can reach
  // domain/agent config without memorizing `/d/:slug?board=` URLs.
  const boardLinks = React.useMemo(
    () => resolveWorkspaceBoardLinks(domainSlug),
    [domainSlug],
  )

  const handleBoardClick = (id: WorkspaceBoardId) => {
    switchWorkspace(id)
  }

  const handleUserClick = () => {
    if (isGuest) return
    setProfileOpen((prev) => !prev)
  }

  const handleSignOut = () => {
    setProfileOpen(false)
    logout()
  }

  const leadAgentSlug = domainData?.leadAgentSlug?.trim() || null
  // Adaptive mobile: Nav hamburger · Wordmark · Chronicle icon (avatar lives in Nav drawer).
  const showMobileChronicle = Boolean(isMobile && onOpenNav && onOpenChronicle)

  return (
    <div className="keeper-platform-top-bar relative z-50 shrink-0">
      <div
        className={[
          "keeper-topbar-identity-row",
          isMobile ? "keeper-topbar-identity-row--mobile" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isMobile && onOpenNav ? (
          <button
            type="button"
            onClick={onOpenNav}
            className="keeper-topbar-nav-trigger shrink-0 rounded-lg p-2"
            aria-label="Open navigation"
            style={{
              color: "hsl(var(--theme-header-text-secondary, var(--theme-ink-secondary)))",
              background: "hsl(var(--theme-surface-panel) / 0.35)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M3 4.5h12M3 9h12M3 13.5h12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        <div
          className="keeper-topbar-playbill-anchor"
          style={{
            maxWidth: isMobile ? PLAYBILL_ANCHOR_MAX_WIDTH_MOBILE : PLAYBILL_ANCHOR_MAX_WIDTH,
          }}
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
            livePulse={
              showLivePulse
                ? livePulseColor
                  ? { color: livePulseColor }
                  : true
                : undefined
            }
            dialogTitle={dialogTitle}
            dialogUnread={dialogUnread}
            onOpenChronicle={onOpenChronicle}
          />
          {isPlaybillOpen ? playbillDropdown : null}
        </div>

        {showMobileChronicle ? (
          <button
            type="button"
            onClick={onOpenChronicle}
            className="keeper-topbar-chronicle-trigger relative shrink-0 rounded-lg p-2"
            aria-label={dialogUnread ? "Open Chronicle — updates available" : "Open Chronicle"}
            style={{
              color: "hsl(var(--theme-header-text-secondary, var(--theme-ink-secondary)))",
              background: "hsl(var(--theme-surface-panel) / 0.35)",
            }}
          >
            <BookOpen width={18} height={18} strokeWidth={1.75} aria-hidden />
            {dialogUnread ? (
              <span
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
                style={{ background: "hsl(var(--theme-accent-primary))" }}
                aria-hidden
              />
            ) : null}
          </button>
        ) : (
          <div className="keeper-topbar-user">
            {!isGuest && !isMobile ? (
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
              aria-haspopup={!isGuest ? "menu" : undefined}
              aria-label={!isGuest ? "Open profile menu" : displayName}
              className="keeper-topbar-avatar-button"
            >
              <UserAvatar
                avatarUrl={avatarUrl}
                initials={initials}
                isOpen={profileOpen}
                isGuest={isGuest}
              />
            </button>
            {profileOpen && !isGuest && (
              <ProfilePopover
                displayName={displayName}
                roleLabel={roleLabel}
                onSignOut={handleSignOut}
                onClose={() => setProfileOpen(false)}
                anchorRef={avatarButtonRef}
              />
            )}
          </div>
        )}
      </div>

      {/* Adaptive mobile: Nav drawer + Playbill own chrome — hide board-link row. */}
      {!(isMobile && onOpenNav) ? (
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
      ) : null}
    </div>
  )
}
