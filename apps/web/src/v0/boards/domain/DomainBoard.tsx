"use client"

/**
 * DomainBoard — Moment 2.7
 *
 * The def is the board. No overrides.
 *
 * Left:   UniversalNavPanel reading DOMAIN_BOARD_DEF.nav (Keeper, Dialogs, Journeys, Boards)
 * Center: UniversalConversation (domain mode)
 * Right:  Chronicle reading DOMAIN_BOARD_DEF.contextSurface
 *
 * DomainSwitcher is a fixed overlay triggered by the top bar — not a panel.
 */

import * as React from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { useV0Shell } from "../../shell/V0ShellContext"
import { DomainSwitcher } from "../../components/DomainSwitcher"
import { UniversalBoard } from "../UniversalBoard"
import { DOMAIN_BOARD_DEF } from "../UniversalBoardDefinition"
import { DomainAddPanel } from "./DomainAddPanel"
import { fetchDomainSwitcherEntries, type DomainSwitcherEntry } from "./domainSwitcherData"
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

export function DomainBoard() {
  const { domainSlug: slug } = useV0Shell()
  const navigate = useNavigate()
  const [switcherOpen, setSwitcherOpen] = React.useState(false)
  const [switcherView, setSwitcherView] = React.useState<SwitcherView>("list")
  const [domains, setDomains] = React.useState<DomainSwitcherEntry[]>([])
  const [fetchState, setFetchState] = React.useState<SwitcherFetchState>("idle")
  const [fetchAttempt, setFetchAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!switcherOpen) {
      setFetchState("idle")
      return
    }

    let cancelled = false
    setFetchState("loading")

    fetchDomainSwitcherEntries()
      .then((rows) => {
        if (cancelled) return
        setDomains(rows)
        setFetchState("ready")
      })
      .catch((error) => {
        console.error("[DomainBoard] Failed to load domains for switcher:", error)
        if (cancelled) return
        setDomains([])
        setFetchState("error")
      })

    return () => {
      cancelled = true
    }
  }, [switcherOpen, fetchAttempt])

  const handleDomainSelect = React.useCallback(
    (nextSlug: string) => {
      navigate(`/d/${encodeURIComponent(nextSlug)}/board?board=domain`)
    },
    [navigate],
  )

  const closeSwitcher = React.useCallback(() => {
    setSwitcherOpen(false)
    setSwitcherView("list")
  }, [])

  const openAddDomain = React.useCallback(() => {
    setSwitcherView("add")
  }, [])

  const handleDomainCreated = React.useCallback(
    (nextSlug: string) => {
      closeSwitcher()
      setFetchAttempt((value) => value + 1)
      navigate(`/d/${encodeURIComponent(nextSlug)}/board?board=domain`)
    },
    [closeSwitcher, navigate],
  )

  const retryFetch = React.useCallback(() => {
    setFetchAttempt((value) => value + 1)
  }, [])

  const switcherOverlay =
    switcherOpen && switcherView === "add" ? (
      <DomainAddPanel
        onClose={closeSwitcher}
        onBack={() => setSwitcherView("list")}
        onCreated={handleDomainCreated}
      />
    ) : switcherOpen && fetchState === "loading" ? (
      <DomainSwitcherStatusPanel
        title="Loading domains"
        message="Fetching your domain list…"
        onClose={closeSwitcher}
      />
    ) : switcherOpen && fetchState === "error" ? (
      <DomainSwitcherStatusPanel
        title="Could not load domains"
        message="The domain list could not be fetched. Check your connection and try again."
        onClose={closeSwitcher}
        actionLabel="Try again"
        onAction={retryFetch}
      />
    ) : switcherOpen && fetchState === "ready" && domains.length === 0 ? (
      <DomainSwitcherStatusPanel
        title="No domains yet"
        message="Create your first domain to get started."
        onClose={closeSwitcher}
        actionLabel="Add a domain"
        onAction={openAddDomain}
      />
    ) : switcherOpen && fetchState === "ready" && domains.length > 0 ? (
      <DomainSwitcher
        domains={domains}
        currentSlug={slug || domains[0]?.slug || ""}
        onSelect={handleDomainSelect}
        onAddDomain={openAddDomain}
        onClose={closeSwitcher}
      />
    ) : null

  return (
    <>
      <UniversalBoard
        def={DOMAIN_BOARD_DEF}
        onDomainClick={() => setSwitcherOpen(true)}
      />
      {typeof document !== "undefined" && switcherOverlay
        ? createPortal(switcherOverlay, document.body)
        : null}
    </>
  )
}
