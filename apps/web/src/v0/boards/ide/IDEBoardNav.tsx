"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import { getApiBase } from "../../../lib/apiFetch"

interface IDEBoardNavProps {
  domainSlug: string
  selectedJourneyId: string | null
  onSelectJourney: (id: string) => void
}

type JourneyItem = { id: string; name: string; createdAt: string }
type KeeperItem = { id: string; name: string; type?: string; createdAt?: string }
type DraftItem = { id: string; title: string; createdAt: string }

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

interface NavSectionProps {
  title: string
  items: Array<{ id: string; primary: string; secondary: string; onClick?: () => void; isActive?: boolean }> | null
  emptyText: string
}

function NavSection({ title, items, emptyText }: NavSectionProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-3 mb-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {title}
        </span>
        <button
          type="button"
          aria-label={`Add ${title.toLowerCase()}`}
          className="flex items-center justify-center w-5 h-5 rounded transition-opacity hover:opacity-60"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {items === null ? (
        <p className="px-3 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="px-3 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {emptyText}
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onClick}
                className="w-full text-left px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: item.isActive
                    ? "hsl(var(--theme-accent-subtle, var(--theme-surface-elevated)))"
                    : "transparent",
                }}
              >
                <p
                  className="text-[12px] leading-snug truncate"
                  style={{
                    color: item.isActive
                      ? "hsl(var(--theme-accent-fg, var(--theme-ink-primary)))"
                      : "hsl(var(--theme-ink-primary))",
                  }}
                >
                  {item.primary}
                </p>
                <p
                  className="text-[10px] leading-snug truncate"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  {item.secondary}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function IDEBoardNav({ domainSlug, selectedJourneyId, onSelectJourney }: IDEBoardNavProps) {
  const [journeys, setJourneys] = React.useState<JourneyItem[] | null>(null)
  const [keepers, setKeepers] = React.useState<KeeperItem[] | null>(null)
  const [drafts, setDrafts] = React.useState<DraftItem[] | null>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)

  // Journeys — public endpoint, no auth required
  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    const base = getApiBase()
    fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { journeys?: JourneyItem[] }) => {
        if (!cancelled) setJourneys(Array.isArray(json.journeys) ? json.journeys : [])
      })
      .catch(() => {
        if (!cancelled) setJourneys([])
      })
    return () => {
      cancelled = true
    }
  }, [domainSlug])

  // Keepers — auth-protected; degrade to empty on failure
  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(domainSlug)}`)
      .then((domain: unknown) => {
        const id = (domain as { id?: string })?.id
        if (!id || cancelled) {
          if (!cancelled) setKeepers([])
          return
        }
        apiFetch(`/api/keepers?domainId=${encodeURIComponent(id)}`)
          .then((res: unknown) => {
            if (cancelled) return
            const r = res as Record<string, unknown>
            const list =
              (r?.data as Record<string, unknown>)?.keepers ??
              r?.keepers ??
              []
            setKeepers(Array.isArray(list) ? (list as KeeperItem[]) : [])
          })
          .catch(() => {
            if (!cancelled) setKeepers([])
          })
      })
      .catch(() => {
        if (!cancelled) setKeepers([])
      })
    return () => {
      cancelled = true
    }
  }, [domainSlug])

  // Drafts — auth-protected; degrade to empty on failure
  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    apiFetch(
      `/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&status=draft&limit=5`,
    )
      .then((res: unknown) => {
        if (cancelled) return
        const list = (res as { data?: unknown })?.data ?? []
        setDrafts(Array.isArray(list) ? (list as DraftItem[]) : [])
      })
      .catch(() => {
        if (!cancelled) setDrafts([])
      })
    return () => {
      cancelled = true
    }
  }, [domainSlug])

  const journeyItems =
    journeys?.slice(0, 5).map((j) => ({
      id: j.id,
      primary: j.name?.trim() || "Untitled journey",
      secondary: formatDate(j.createdAt),
      isActive: j.id === selectedJourneyId,
      onClick: () => onSelectJourney(j.id),
    })) ?? null

  const keeperItems =
    keepers?.slice(0, 5).map((k) => ({
      id: k.id,
      primary: k.name?.trim() || "Untitled keeper",
      secondary: k.type ?? "Keeper",
    })) ?? null

  const draftItems =
    drafts?.slice(0, 5).map((d) => ({
      id: d.id,
      primary: d.title?.trim() || "Untitled draft",
      secondary: formatDate(d.createdAt),
    })) ?? null

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-3 min-h-0">
        {/* Primary section: Journeys, Keepers, Drafts */}
        <NavSection
          title="Journeys"
          items={journeyItems}
          emptyText="No journeys yet"
        />
        <NavSection
          title="Keepers"
          items={keeperItems}
          emptyText="No keepers yet"
        />
        <NavSection
          title="Drafts"
          items={draftItems}
          emptyText="No drafts yet"
        />

        {/* Board-specific: Recent + Next cards */}
        <div className="px-3 mt-4 space-y-2">
          <div
            className="rounded-md px-3 py-2.5 border"
            style={{
              borderColor: "hsl(var(--theme-line-hairline))",
              background: "hsl(var(--theme-surface-elevated))",
            }}
          >
            <p
              className="text-[9px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Recent
            </p>
            <p
              className="text-[11px] leading-snug"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              Last build prompt: Prompt 8 — IDE Board Nav Panel
            </p>
          </div>
          <div
            className="rounded-md px-3 py-2.5 border"
            style={{
              borderColor: "hsl(var(--theme-line-hairline))",
              background: "hsl(var(--theme-surface-elevated))",
            }}
          >
            <p
              className="text-[9px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Next
            </p>
            <p
              className="text-[11px] leading-snug"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              Prompt 9 — Kip conversation surface
            </p>
          </div>
        </div>
      </div>

      {/* Secondary: ··· More overflow — pinned to bottom */}
      <div
        className="shrink-0 border-t px-3 py-2"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <button
          type="button"
          onClick={() => setMoreOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-1 py-1 rounded-sm transition-opacity hover:opacity-70"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          aria-expanded={moreOpen}
          aria-label="More frames"
        >
          <span className="text-[15px] leading-none tracking-widest select-none">···</span>
          <span className="text-[11px] font-medium">More</span>
        </button>
        {moreOpen && (
          <ul className="mt-1 space-y-0.5 pb-1">
            {(["Feed", "Admin", "Diagnostics"] as const).map((label) => (
              <li key={label}>
                {/* TODO: wire to navigateToFrame when frame navigation is available */}
                <button
                  type="button"
                  className="w-full text-left px-1 py-1 rounded-sm text-[11px] transition-opacity hover:opacity-70"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
