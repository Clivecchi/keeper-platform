/**
 * Member cross-nav index — search Dialogs, Drafts, Keepers, Library together.
 * Data from GET /api/domains/:domainId/nav-index (same assembly family as Kip domainIndex).
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"

export type CrossNavIndexItem = {
  kind: "dialog" | "draft" | "keeper" | "library"
  id: string
  title: string
  subtitle?: string
  tier?: "dialog" | "chatter"
  updatedAt: string
}

type CrossNavIndexProps = {
  domainId: string
  open: boolean
  onClose: () => void
  onSelect: (item: CrossNavIndexItem) => void
}

const KIND_LABEL: Record<CrossNavIndexItem["kind"], string> = {
  dialog: "Dialog",
  draft: "Draft",
  keeper: "Keeper",
  library: "Library",
}

const SURFACE = {
  scrim: "hsl(var(--theme-ink-primary) / 0.58)",
  panel: "hsl(var(--theme-surface-paper) / 0.97)",
  border: "hsl(var(--theme-border-soft))",
  ink: "hsl(var(--theme-ink-primary))",
  muted: "hsl(var(--theme-ink-secondary))",
}

export function CrossNavIndex({ domainId, open, onClose, onSelect }: CrossNavIndexProps) {
  const [query, setQuery] = React.useState("")
  const [items, setItems] = React.useState<CrossNavIndexItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) return
    setQuery("")
    const t = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [open])

  React.useEffect(() => {
    if (!open || !domainId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""
    void apiFetch(`/api/domains/${encodeURIComponent(domainId)}/nav-index${qs}`)
      .then((res: { items?: CrossNavIndexItem[] }) => {
        if (!cancelled) setItems(Array.isArray(res?.items) ? res.items : [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load index")
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, domainId, query])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: SURFACE.scrim }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-lg border shadow-lg overflow-hidden"
        style={{
          background: SURFACE.panel,
          borderColor: SURFACE.border,
          color: SURFACE.ink,
          boxShadow: "0 18px 48px hsl(var(--theme-ink-primary) / 0.28)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search Dialogs, Keepers, Library, and Drafts"
      >
        <div className="px-3 py-2 border-b" style={{ borderColor: SURFACE.border }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Dialogs, Keepers, Library, Drafts…"
            className="w-full bg-transparent text-sm outline-none py-2"
            style={{ color: SURFACE.ink }}
            aria-label="Search across nav"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <p className="text-xs px-3 py-3" style={{ color: SURFACE.muted }}>
              Searching…
            </p>
          )}
          {error && (
            <p className="text-xs px-3 py-3" style={{ color: "hsl(var(--destructive))" }}>
              {error}
            </p>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="text-xs px-3 py-3" style={{ color: SURFACE.muted }}>
              No matches.
            </p>
          )}
          {items.map((item) => (
            <button
              key={`${item.kind}:${item.id}`}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm flex flex-col gap-0.5 border-b"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                color: SURFACE.ink,
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "hsl(var(--theme-surface-panel) / 0.72)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
              }}
              onClick={() => {
                onSelect(item)
                onClose()
              }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="text-[10px] uppercase tracking-wide w-14 shrink-0"
                  style={{ color: SURFACE.muted }}
                >
                  {item.kind === "dialog" && item.tier === "chatter"
                    ? "Chatter"
                    : KIND_LABEL[item.kind]}
                </span>
                <span className="truncate font-medium">{item.title}</span>
              </span>
              {item.subtitle ? (
                <span
                  className="text-xs pl-[3.5rem] truncate"
                  style={{ color: SURFACE.muted }}
                >
                  {item.subtitle}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div
          className="px-3 py-1.5 text-[10px] border-t"
          style={{ borderColor: SURFACE.border, color: SURFACE.muted }}
        >
          Esc to close
        </div>
      </div>
    </div>
  )
}
