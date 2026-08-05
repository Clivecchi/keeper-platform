"use client"

/**
 * Account row for the mobile Nav drawer — relocated from Top Bar avatar.
 * Same profile / sign-out behavior as KeeperTopBar; entry point only moved.
 */

import * as React from "react"
import { useAuth } from "../../../context/AuthContext"
import { useV0Shell } from "../../shell/V0ShellContext"
import { getBlobProxyUrl } from "../../../lib/blobProxy"

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

export function BoardMobileNavAccount() {
  const { user, logout } = useAuth()
  const { resolvedAudience } = useV0Shell()
  const [profileOpen, setProfileOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const isGuest = resolvedAudience === "guest"
  const initials = getInitials(user?.name ?? null, user?.email ?? null)
  const displayName = user?.name?.trim() || user?.email?.trim() || "Guest"
  const roleLabel = getRoleLabel(resolvedAudience)
  const avatarUrl = user?.avatar_url?.trim() ? getBlobProxyUrl(user.avatar_url.trim()) : null

  React.useEffect(() => {
    if (!profileOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node)
        || menuRef.current?.contains(e.target as Node)
      ) {
        return
      }
      setProfileOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false)
    }
    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [profileOpen])

  const handleClick = () => {
    if (isGuest) return
    setProfileOpen((prev) => !prev)
  }

  const handleSignOut = () => {
    setProfileOpen(false)
    logout()
  }

  return (
    <div className="board-mobile-nav-account relative shrink-0 border-t px-3 py-3"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        aria-expanded={profileOpen}
        aria-haspopup={!isGuest ? "menu" : undefined}
        aria-label={!isGuest ? "Open profile menu" : displayName}
        className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-opacity hover:opacity-90"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="keeper-topbar-avatar keeper-topbar-avatar-image"
            data-open={profileOpen ? "true" : "false"}
            data-guest={isGuest ? "true" : "false"}
            draggable={false}
          />
        ) : (
          <span
            className="keeper-topbar-avatar"
            data-open={profileOpen ? "true" : "false"}
            data-guest={isGuest ? "true" : "false"}
            aria-hidden
          >
            {initials}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-[13px] font-medium"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {displayName}
          </span>
          <span
            className="block truncate text-[11px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {roleLabel}
          </span>
        </span>
      </button>

      {profileOpen && !isGuest ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Profile menu"
          className="mt-2 overflow-hidden rounded-lg border"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.45)",
            background: "hsl(var(--theme-surface-elevated) / 0.95)",
          }}
        >
          <div className="px-3 py-2.5">
            <p
              className="truncate text-[13px] font-medium"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {displayName}
            </p>
            <p
              className="truncate text-[11px]"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {roleLabel}
            </p>
          </div>
          <div
            aria-hidden
            style={{ height: 1, background: "hsl(var(--theme-border-soft) / 0.4)" }}
          />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full px-3 py-2.5 text-left text-[13px] transition-opacity hover:opacity-80"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
