"use client"

import * as React from "react"
import { FileText } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useV0Shell } from "../shell/V0ShellContext"
import { useAuth } from "../../context/AuthContext"

// ─── Types ────────────────────────────────────────────────────────────────────

type TopBarBoardId = "domain" | "ide" | "designer" | "agent"

interface KeeperTopBarProps {
  onDomainClick: () => void
  onBriefClick: () => void
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

export function KeeperTopBar({ onDomainClick, onBriefClick }: KeeperTopBarProps) {
  const { domainSlug, domainFrame, resolvedAudience } = useV0Shell()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        borderBottom: "1px solid var(--theme-border-soft)",
        backgroundColor: "hsl(var(--theme-surface-paper) / 0.98)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Row 1: domain identity + user */}
      <div
        className="flex items-center justify-between px-5"
        style={{
          height: 40,
          borderBottom: "0.5px solid var(--theme-border-soft)",
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
            className="font-serif text-[15px] font-semibold leading-tight truncate max-w-[280px]"
            style={{ color: "var(--theme-ink-primary)" }}
          >
            {wordmark}
          </span>
          {tagline ? (
            <span
              className="text-[11px] leading-none truncate max-w-[280px] mt-0.5"
              style={{ color: "var(--theme-ink-muted, var(--theme-ink-secondary))" }}
            >
              {tagline}
            </span>
          ) : null}
        </button>

        {/* Right: user name, role, avatar */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right">
            <p
              className="text-[12px] font-medium leading-tight"
              style={{ color: "var(--theme-ink-primary)" }}
            >
              {displayName}
            </p>
            <p
              className="text-[10px] leading-none mt-0.5"
              style={{ color: "var(--theme-ink-muted, var(--theme-ink-secondary))" }}
            >
              {roleLabel}
            </p>
          </div>
          {/* Avatar circle */}
          <div
            className="flex items-center justify-center rounded-full shrink-0 text-[11px] font-semibold"
            style={{
              width: 26,
              height: 26,
              backgroundColor: "hsl(var(--theme-surface-raised, var(--theme-surface-paper)) / 1)",
              border: "1px solid var(--theme-border-soft)",
              color: "var(--theme-ink-secondary)",
            }}
            aria-hidden
          >
            {initials}
          </div>
        </div>
      </div>

      {/* Row 2: board links + Brief */}
      <div
        className="flex items-center justify-between px-5"
        style={{
          height: 32,
          borderBottom: "0.5px solid var(--theme-border-soft)",
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
                    className="select-none px-1.5 text-[12px]"
                    style={{ color: "var(--theme-ink-muted, var(--theme-ink-secondary))" }}
                    aria-hidden
                  >
                    ·
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleBoardClick(id)}
                  className="text-[12px] transition-colors"
                  style={{
                    fontWeight: isActive ? 500 : 400,
                    color: isActive
                      ? "var(--theme-ink-primary)"
                      : "var(--theme-ink-muted, var(--theme-ink-secondary))",
                  }}
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
          className="flex items-center gap-1 transition-colors"
          style={{ color: "var(--theme-ink-muted, var(--theme-ink-secondary))" }}
          aria-label="Open domain brief"
        >
          <FileText className="shrink-0" style={{ width: 13, height: 13 }} strokeWidth={1.75} aria-hidden />
          <span className="text-[12px]">Brief</span>
        </button>
      </div>
    </div>
  )
}
