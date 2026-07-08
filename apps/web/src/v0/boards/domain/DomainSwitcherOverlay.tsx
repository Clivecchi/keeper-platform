"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useNavigate, useLocation } from "react-router-dom"
import { DomainSwitcher } from "../../components/DomainSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"
import type { WorkspaceBoardId } from "../workspaceBoardNav"
import {
  HOME_SHELL_BOARD,
  isWorkspaceBoardAvailableForDomain,
  resolveDefaultWorkspaceBoardId,
} from "../domainWorkspaceBoards"
import { buildHomePath, HOME_DOMAIN_PARAM } from "../../shell/shellMode"
import { DomainAddPanel } from "./DomainAddPanel"
import {
  fetchDomainSwitcherEntries,
  getCachedDomainSwitcherEntries,
  prefetchDomainSwitcherEntries,
  subscribeDomainSwitcherCache,
  type DomainSwitcherEntry,
} from "./domainSwitcherData"
import { prefetchDomainShell } from "./domainShellCache"
import {
  SWITCHER_INK_MUTED,
  SWITCHER_INK_PRIMARY,
  SWITCHER_INK_SECONDARY,
  SWITCHER_PANEL_STYLE,
} from "./domainSwitcherTheme"

type SwitcherFetchState = "idle" | "loading" | "ready" | "error"
type SwitcherView = "list" | "add"

function DomainSwitcherStatusPanel({
  title,
  message,
  onClose,
  actionLabel,
  onAction,
}: {
  title: string
  message: string
  onClose: () => void
  actionLabel?: string
  onAction?: () => void
}) {
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-[100]" aria-hidden onClick={onClose} />
      <div
        className="fixed z-[101] flex flex-col overflow-hidden rounded-md"
        style={{
          ...SWITCHER_PANEL_STYLE,
          width: 210,
        }}
        role="dialog"
        aria-label={title}
        aria-modal="false"
      >
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0"
          style={{ borderBottom: "0.5px solid hsl(var(--theme-border-soft))" }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: SWITCHER_INK_MUTED }}
          >
            Your Domains
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-sm transition-opacity hover:opacity-70"
            style={{
              width: 18,
              height: 18,
              color: SWITCHER_INK_SECONDARY,
            }}
            aria-label="Close domain switcher"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path
                d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="px-3 py-4">
          <p
            className="text-[11px] font-medium mb-1"
            style={{ color: SWITCHER_INK_PRIMARY }}
          >
            {title}
          </p>
          <p
            className="text-[10px] leading-snug"
            style={{ color: SWITCHER_INK_SECONDARY }}
          >
            {message}
          </p>
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-3 text-[10px] font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: SWITCHER_INK_PRIMARY }}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </>
  )
}

export interface DomainSwitcherOverlayProps {
  open: boolean
  onClose: () => void
  /** Workspace board to land on after domain select or create. */
  targetBoardId: WorkspaceBoardId
  currentSlug: string
}

function resolveTargetBoardForDomain(
  slug: string,
  requestedBoardId: WorkspaceBoardId,
): WorkspaceBoardId {
  if (requestedBoardId === HOME_SHELL_BOARD) {
    return resolveDefaultWorkspaceBoardId(slug)
  }
  return isWorkspaceBoardAvailableForDomain(requestedBoardId, slug)
    ? requestedBoardId
    : resolveDefaultWorkspaceBoardId(slug)
}

function buildDomainBoardUrl(
  slug: string,
  boardId: WorkspaceBoardId,
  preservedSearch: URLSearchParams,
): string {
  const params = new URLSearchParams()
  params.set("board", resolveTargetBoardForDomain(slug, boardId))
  const theme = preservedSearch.get("theme")
  const style = preservedSearch.get("style")
  if (theme) params.set("theme", theme)
  if (style) params.set("style", style)
  return `/d/${encodeURIComponent(slug)}?${params.toString()}`
}

export function DomainSwitcherOverlay({
  open,
  onClose,
  targetBoardId,
  currentSlug,
}: DomainSwitcherOverlayProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { shellMode } = useV0Shell()
  const [switcherView, setSwitcherView] = React.useState<SwitcherView>("list")
  const [domains, setDomains] = React.useState<DomainSwitcherEntry[]>([])
  const [fetchState, setFetchState] = React.useState<SwitcherFetchState>("idle")
  const [fetchAttempt, setFetchAttempt] = React.useState(0)

  React.useEffect(() => {
    return subscribeDomainSwitcherCache(() => {
      const cached = getCachedDomainSwitcherEntries()
      if (cached) setDomains(cached)
    })
  }, [])

  React.useEffect(() => {
    if (!open) {
      setSwitcherView("list")
      return
    }

    let cancelled = false
    const cached = getCachedDomainSwitcherEntries()
    const hasCachedList = cached !== null
    const forceRefresh = fetchAttempt > 0 || hasCachedList

    if (hasCachedList) {
      setDomains(cached)
      setFetchState("ready")
    } else {
      setFetchState("loading")
    }

    fetchDomainSwitcherEntries({ forceRefresh })
      .then((rows) => {
        if (cancelled) return
        setDomains(rows)
        setFetchState("ready")
      })
      .catch((error) => {
        console.error("[DomainSwitcherOverlay] Failed to load domains:", error)
        if (cancelled) return
        if (hasCachedList) {
          setFetchState("ready")
          return
        }
        setDomains([])
        setFetchState("error")
      })

    return () => {
      cancelled = true
    }
  }, [open, fetchAttempt])

  const handlePrefetchDomain = React.useCallback(
    (slug: string) => {
      if (slug && slug !== currentSlug) prefetchDomainShell(slug)
    },
    [currentSlug],
  )

  const navigateAfterDomainPick = React.useCallback(
    (nextSlug: string) => {
      if (nextSlug !== currentSlug) prefetchDomainShell(nextSlug)
      const preserved = new URLSearchParams(location.search)
      if (shellMode === "home" || targetBoardId === HOME_SHELL_BOARD) {
        preserved.set(HOME_DOMAIN_PARAM, nextSlug)
        preserved.delete("board")
        navigate(buildHomePath(preserved), { replace: true })
        return
      }
      navigate(buildDomainBoardUrl(nextSlug, targetBoardId, preserved), {
        replace: true,
      })
    },
    [navigate, targetBoardId, currentSlug, location.search, shellMode],
  )

  const handleDomainSelect = React.useCallback(
    (nextSlug: string) => {
      navigateAfterDomainPick(nextSlug)
      onClose()
    },
    [navigateAfterDomainPick, onClose],
  )

  const closeSwitcher = React.useCallback(() => {
    onClose()
    setSwitcherView("list")
  }, [onClose])

  const openAddDomain = React.useCallback(() => {
    setSwitcherView("add")
  }, [])

  const handleDomainCreated = React.useCallback(
    (nextSlug: string) => {
      closeSwitcher()
      setFetchAttempt((value) => value + 1)
      navigateAfterDomainPick(nextSlug)
    },
    [closeSwitcher, navigateAfterDomainPick],
  )

  const retryFetch = React.useCallback(() => {
    setFetchAttempt((value) => value + 1)
  }, [])

  if (!open) return null

  const overlay =
    switcherView === "add" ? (
      <DomainAddPanel
        onClose={closeSwitcher}
        onBack={() => setSwitcherView("list")}
        onCreated={handleDomainCreated}
      />
    ) : fetchState === "loading" ? (
      <DomainSwitcherStatusPanel
        title="Loading domains"
        message="Fetching your domain list…"
        onClose={closeSwitcher}
      />
    ) : fetchState === "error" ? (
      <DomainSwitcherStatusPanel
        title="Could not load domains"
        message="The domain list could not be fetched. Check your connection and try again."
        onClose={closeSwitcher}
        actionLabel="Try again"
        onAction={retryFetch}
      />
    ) : fetchState === "ready" && domains.length === 0 ? (
      <DomainSwitcherStatusPanel
        title="No domains yet"
        message="Create your first domain to get started."
        onClose={closeSwitcher}
        actionLabel="Add a domain"
        onAction={openAddDomain}
      />
    ) : fetchState === "ready" && domains.length > 0 ? (
      <DomainSwitcher
        domains={domains}
        currentSlug={currentSlug || domains[0]?.slug || ""}
        onSelect={handleDomainSelect}
        onAddDomain={openAddDomain}
        onClose={closeSwitcher}
        onPrefetchDomain={handlePrefetchDomain}
      />
    ) : null

  if (!overlay || typeof document === "undefined") return null

  return createPortal(overlay, document.body)
}

export interface UseDomainSwitcherResult {
  openSwitcher: () => void
  switcherOverlay: React.ReactNode
}

/** Open/close state + portaled overlay for the top-bar domain switcher. */
export function useDomainSwitcher(targetBoardId: WorkspaceBoardId): UseDomainSwitcherResult {
  const { domainSlug } = useV0Shell()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    prefetchDomainSwitcherEntries()
  }, [])

  const openSwitcher = React.useCallback(() => {
    setOpen(true)
  }, [])

  const closeSwitcher = React.useCallback(() => {
    setOpen(false)
  }, [])

  const switcherOverlay = (
    <DomainSwitcherOverlay
      open={open}
      onClose={closeSwitcher}
      targetBoardId={targetBoardId}
      currentSlug={domainSlug ?? ""}
    />
  )

  return { openSwitcher, switcherOverlay }
}
