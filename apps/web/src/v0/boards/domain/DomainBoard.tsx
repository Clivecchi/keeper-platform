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
import { useNavigate } from "react-router-dom"
import { useV0Shell } from "../../shell/V0ShellContext"
import { DomainSwitcher } from "../../components/DomainSwitcher"
import { UniversalBoard } from "../UniversalBoard"
import { DOMAIN_BOARD_DEF } from "../UniversalBoardDefinition"
import { fetchDomainSwitcherEntries, type DomainSwitcherEntry } from "./domainSwitcherData"

type SwitcherFetchState = "idle" | "loading" | "ready" | "error"

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
      <div className="fixed inset-0 z-40" aria-hidden onClick={onClose} />
      <div
        className="absolute z-50 flex flex-col overflow-hidden rounded-md"
        style={{
          top: 72,
          left: 0,
          width: 210,
          border: "1px solid hsl(var(--theme-border-soft))",
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.98)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
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
            style={{ color: "var(--theme-ink-secondary-color)" }}
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
              color: "var(--theme-ink-secondary-color)",
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
            style={{ color: "var(--theme-ink-primary-color)" }}
          >
            {title}
          </p>
          <p
            className="text-[10px] leading-snug"
            style={{ color: "var(--theme-ink-secondary-color)" }}
          >
            {message}
          </p>
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-3 text-[10px] font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: "var(--theme-ink-primary-color)" }}
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
  }, [])

  const retryFetch = React.useCallback(() => {
    setFetchAttempt((value) => value + 1)
  }, [])

  return (
    <>
      <UniversalBoard
        def={DOMAIN_BOARD_DEF}
        onDomainClick={() => setSwitcherOpen(true)}
      />
      {switcherOpen && fetchState === "loading" ? (
        <DomainSwitcherStatusPanel
          title="Loading domains"
          message="Fetching your domain list…"
          onClose={closeSwitcher}
        />
      ) : null}
      {switcherOpen && fetchState === "error" ? (
        <DomainSwitcherStatusPanel
          title="Could not load domains"
          message="The domain list could not be fetched. Check your connection and try again."
          onClose={closeSwitcher}
          actionLabel="Try again"
          onAction={retryFetch}
        />
      ) : null}
      {switcherOpen && fetchState === "ready" && domains.length === 0 ? (
        <DomainSwitcherStatusPanel
          title="No domains yet"
          message="You do not have any domains to switch to. Domain creation is coming in the next step."
          onClose={closeSwitcher}
        />
      ) : null}
      {switcherOpen && fetchState === "ready" && domains.length > 0 ? (
        <DomainSwitcher
          domains={domains}
          currentSlug={slug || domains[0]?.slug || ""}
          onSelect={handleDomainSelect}
          onAddDomain={() => console.log("Add domain")}
          onClose={closeSwitcher}
        />
      ) : null}
    </>
  )
}
