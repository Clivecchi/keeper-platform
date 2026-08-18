"use client"

import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { DomainSwitcher } from "../../components/DomainSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"
import type { WorkspaceBoardId } from "../workspaceBoardNav"
import { toWorkspaceBoardUrlParam } from "../workspaceBoardNav"
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
  peekDomainSwitcherEntries,
  prefetchDomainSwitcherEntries,
  subscribeDomainSwitcherCache,
  type DomainSwitcherEntry,
} from "./domainSwitcherData"
import { prefetchDomainShell } from "./domainShellCache"
import { persistRealmAnchor } from "../../realm/persistRealmAnchor"
import { useSceneChangeOptional } from "../../sceneChange/SceneChangeProvider"
import { prefetchPlaybillAgentsForDomains } from "../../lib/playbillData"
import {
  SWITCHER_INK_PRIMARY,
  SWITCHER_INK_SECONDARY,
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
  const panelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const anchor = document.querySelector(".keeper-topbar-playbill-anchor")
      if (anchor?.contains(event.target as Node)) return
      if (panelRef.current?.contains(event.target as Node)) return
      onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return (
    <div ref={panelRef} className="keeper-topbar-playbill-dropdown" role="status">
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
  params.set("board", toWorkspaceBoardUrlParam(resolveTargetBoardForDomain(slug, boardId)))
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
  const sceneChange = useSceneChangeOptional()
  const [switcherView, setSwitcherView] = React.useState<SwitcherView>("list")
  const [domains, setDomains] = React.useState<DomainSwitcherEntry[]>(
    () => peekDomainSwitcherEntries() ?? [],
  )
  const [fetchState, setFetchState] = React.useState<SwitcherFetchState>(() =>
    peekDomainSwitcherEntries() !== null ? "ready" : "idle",
  )
  const [fetchAttempt, setFetchAttempt] = React.useState(0)

  React.useEffect(() => {
    return subscribeDomainSwitcherCache(() => {
      const peeked = peekDomainSwitcherEntries()
      if (peeked) setDomains(peeked)
    })
  }, [])

  React.useEffect(() => {
    if (!open) {
      setSwitcherView("list")
      return
    }

    let cancelled = false
    const peeked = peekDomainSwitcherEntries()
    const fresh = getCachedDomainSwitcherEntries()
    const hasAnyList = peeked !== null
    // Retry always hits network; stale cache also revalidates in background.
    const forceRefresh = fetchAttempt > 0 || (hasAnyList && fresh === null)

    if (hasAnyList) {
      setDomains(peeked)
      setFetchState("ready")
      void prefetchPlaybillAgentsForDomains(peeked)
    } else {
      setFetchState("loading")
    }

    fetchDomainSwitcherEntries({ forceRefresh })
      .then((rows) => {
        if (cancelled) return
        setDomains(rows)
        setFetchState("ready")
        void prefetchPlaybillAgentsForDomains(rows)
      })
      .catch((error) => {
        console.error("[DomainSwitcherOverlay] Failed to load domains:", error)
        if (cancelled) return
        if (hasAnyList) {
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
        void persistRealmAnchor({ domainSlug: nextSlug }).catch((error) => {
          console.warn("[DomainSwitcherOverlay] Anchor persist failed:", error)
        })
        const go = () => navigate(buildHomePath(preserved), { replace: true })
        if (sceneChange && nextSlug !== currentSlug) {
          void sceneChange.travelToSlug(nextSlug, go)
          return
        }
        go()
        return
      }
      const path = buildDomainBoardUrl(nextSlug, targetBoardId, preserved)
      const go = () => navigate(path, { replace: true })
      if (sceneChange && nextSlug !== currentSlug) {
        void sceneChange.travelToSlug(nextSlug, go)
        return
      }
      go()
    },
    [navigate, targetBoardId, currentSlug, location.search, shellMode, sceneChange],
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

  if (!overlay) return null

  return overlay
}

export interface UseDomainSwitcherResult {
  openSwitcher: () => void
  switcherOverlay: React.ReactNode
  isSwitcherOpen: boolean
}

/** Open/close state + portaled overlay for the top-bar domain switcher. */
export function useDomainSwitcher(targetBoardId: WorkspaceBoardId): UseDomainSwitcherResult {
  const { domainSlug } = useV0Shell()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    prefetchDomainSwitcherEntries()
  }, [])

  const openSwitcher = React.useCallback(() => {
    setOpen((prev) => !prev)
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

  return { openSwitcher, switcherOverlay, isSwitcherOpen: open }
}
