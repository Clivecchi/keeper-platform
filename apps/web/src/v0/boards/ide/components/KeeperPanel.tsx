"use client"

import * as React from "react"
import { PencilIcon } from "@heroicons/react/24/outline"
import { apiFetch } from "../../../../lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeeperDetail {
  id: string
  title: string
  purpose: string | null
}

interface KeeperJourney {
  id: string
  name: string
  momentCount: number
}

type LoadState = "idle" | "loading" | "ready" | "error"

// ─── Props ────────────────────────────────────────────────────────────────────

interface KeeperPanelProps {
  keeperId: string
  /** Optimistic display name while keeper data loads */
  keeperName?: string | null
  domainId: string | null
  onJourneySelect: (id: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KeeperPanel({
  keeperId,
  keeperName,
  domainId,
  onJourneySelect,
}: KeeperPanelProps) {
  const [keeper, setKeeper] = React.useState<KeeperDetail | null>(null)
  const [journeys, setJourneys] = React.useState<KeeperJourney[]>([])
  const [loadState, setLoadState] = React.useState<LoadState>("idle")
  const [journeysLoadState, setJourneysLoadState] = React.useState<LoadState>("idle")

  const [editingTitle, setEditingTitle] = React.useState(false)
  const [editingPurpose, setEditingPurpose] = React.useState(false)
  const [titleDraft, setTitleDraft] = React.useState("")
  const [purposeDraft, setPurposeDraft] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  // Fetch keeper detail on mount / keeperId change
  React.useEffect(() => {
    if (!keeperId) return
    let cancelled = false
    setLoadState("loading")
    setKeeper(null)
    apiFetch(`/api/keepers/${keeperId}`)
      .then((res: unknown) => {
        if (cancelled) return
        const raw = res as Record<string, unknown>
        const k = (raw?.keeper ?? raw?.data ?? raw) as Record<string, unknown> | null
        if (k?.id) {
          const detail: KeeperDetail = {
            id: k.id as string,
            title: (k.title as string | undefined) ?? (k.name as string | undefined) ?? "",
            purpose: (k.purpose as string | null | undefined) ?? null,
          }
          setKeeper(detail)
          setTitleDraft(detail.title)
          setPurposeDraft(detail.purpose ?? "")
          setLoadState("ready")
        } else {
          setLoadState("error")
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [keeperId])

  // Fetch journeys associated with this keeper
  React.useEffect(() => {
    if (!keeperId) return
    let cancelled = false
    setJourneysLoadState("loading")
    setJourneys([])
    const params = new URLSearchParams()
    params.set("keeperId", keeperId)
    if (domainId) params.set("domainId", domainId)
    apiFetch(`/api/journeys?${params.toString()}`)
      .then((res: unknown) => {
        if (cancelled) return
        const raw = res as Record<string, unknown>
        const list = (
          (raw?.data as Record<string, unknown> | undefined)?.journeys ??
          raw?.journeys ??
          []
        ) as Record<string, unknown>[]
        setJourneys(
          list.map((j) => ({
            id: j.id as string,
            name: (j.name as string | undefined) ?? "Untitled Journey",
            momentCount: (j.momentCount as number | undefined) ?? 0,
          })),
        )
        setJourneysLoadState("ready")
      })
      .catch(() => {
        if (!cancelled) setJourneysLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [keeperId, domainId])

  const saveField = async (field: "title" | "purpose", value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (field === "title" && trimmed === keeper?.title) return
    if (field === "purpose" && trimmed === (keeper?.purpose ?? "")) return
    setIsSaving(true)
    try {
      const payload: Record<string, string> = {}
      payload[field] = trimmed
      const res = (await apiFetch(`/api/keepers/${keeperId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })) as Record<string, unknown>
      const updated = (res?.keeper ?? res?.data ?? res) as Record<string, unknown> | null
      if (updated?.id) {
        setKeeper((prev) => (prev ? { ...prev, [field]: trimmed } : prev))
      }
    } catch {
      // silent — next load will restore correct value
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = keeper?.title ?? keeperName ?? "Keeper"
  const totalMoments = journeys.reduce((sum, j) => sum + j.momentCount, 0)

  return (
    <div className="flex flex-col h-full min-h-0" style={{ color: "hsl(var(--theme-ink-primary))" }}>
      {/* ── Panel header ─── */}
      <div
        className="shrink-0 px-4 py-4 border-b"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Keeper
        </p>

        {loadState === "loading" ? (
          <p className="text-[14px] font-semibold mt-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            {keeperName ?? "Loading…"}
          </p>
        ) : editingTitle ? (
          <input
            autoFocus
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={async () => {
              setEditingTitle(false)
              await saveField("title", titleDraft)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") {
                setTitleDraft(keeper?.title ?? "")
                setEditingTitle(false)
              }
            }}
            disabled={isSaving}
            className="w-full bg-transparent text-[14px] font-semibold mt-1 border-b focus:outline-none"
            style={{
              color: "hsl(var(--theme-ink-primary))",
              borderColor: "hsl(var(--theme-line-hairline))",
            }}
          />
        ) : (
          <button
            type="button"
            className="group flex items-center gap-1.5 mt-1 w-full text-left"
            onClick={() => {
              setTitleDraft(keeper?.title ?? "")
              setEditingTitle(true)
            }}
          >
            <p
              className="text-[14px] font-semibold truncate"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {displayName}
            </p>
            <PencilIcon
              className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            />
          </button>
        )}
      </div>

      {/* ── Scrollable body ─── */}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto">
        {loadState === "error" && (
          <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Couldn&apos;t load this Keeper.
          </p>
        )}

        {loadState === "ready" && (
          <>
            {/* ── Purpose ── */}
            <div
              className="px-4 py-4 border-b"
              style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
            >
              {editingPurpose ? (
                <textarea
                  autoFocus
                  value={purposeDraft}
                  onChange={(e) => setPurposeDraft(e.target.value)}
                  onBlur={async () => {
                    setEditingPurpose(false)
                    await saveField("purpose", purposeDraft)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setPurposeDraft(keeper?.purpose ?? "")
                      setEditingPurpose(false)
                    }
                  }}
                  disabled={isSaving}
                  rows={4}
                  className="w-full bg-transparent text-[12px] leading-relaxed resize-none focus:outline-none border rounded px-2 py-1.5"
                  style={{
                    color: "hsl(var(--theme-ink-secondary))",
                    borderColor: "hsl(var(--theme-line-hairline))",
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="group w-full text-left"
                  onClick={() => {
                    setPurposeDraft(keeper?.purpose ?? "")
                    setEditingPurpose(true)
                  }}
                >
                  {keeper?.purpose?.trim() ? (
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "hsl(var(--theme-ink-secondary))" }}
                    >
                      {keeper.purpose.trim()}
                    </p>
                  ) : (
                    <p
                      className="text-[12px] leading-relaxed italic"
                      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    >
                      No description yet — click to add
                    </p>
                  )}
                  <PencilIcon
                    className="h-3 w-3 mt-1.5 opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  />
                </button>
              )}
            </div>

            {/* ── Counts ── */}
            <div
              className="px-4 py-3 flex items-center gap-6 border-b"
              style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
            >
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  Journeys
                </p>
                <p
                  className="text-[20px] font-semibold mt-0.5 tabular-nums"
                  style={{ color: "hsl(var(--theme-ink-primary))" }}
                >
                  {journeysLoadState === "ready" ? journeys.length : "—"}
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  Moments
                </p>
                <p
                  className="text-[20px] font-semibold mt-0.5 tabular-nums"
                  style={{ color: "hsl(var(--theme-ink-primary))" }}
                >
                  {journeysLoadState === "ready" ? totalMoments : "—"}
                </p>
              </div>
            </div>

            {/* ── Journeys list ── */}
            <div>
              <p
                className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                Journeys
              </p>

              {journeysLoadState === "loading" && (
                <p className="px-4 pb-4 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  Loading journeys…
                </p>
              )}

              {journeysLoadState === "error" && (
                <p className="px-4 pb-4 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  Couldn&apos;t load journeys.
                </p>
              )}

              {journeysLoadState === "ready" && journeys.length === 0 && (
                <p className="px-4 pb-4 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  No journeys associated with this Keeper yet.
                </p>
              )}

              {journeysLoadState === "ready" && journeys.length > 0 && (
                <ul className="pb-2">
                  {journeys.map((j) => (
                    <li key={j.id}>
                      <button
                        type="button"
                        onClick={() => onJourneySelect(j.id)}
                        className="w-full text-left px-4 py-3 border-b flex items-center justify-between gap-3 transition-colors hover:opacity-80 group"
                        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
                      >
                        <p
                          className="text-[12px] font-medium leading-snug truncate"
                          style={{ color: "hsl(var(--theme-ink-primary))" }}
                        >
                          {j.name}
                        </p>
                        <span
                          className="shrink-0 text-[10px] tabular-nums"
                          style={{
                            color:
                              j.momentCount === 0
                                ? "hsl(var(--theme-ink-tertiary))"
                                : "hsl(var(--theme-ink-secondary))",
                          }}
                        >
                          {j.momentCount} {j.momentCount === 1 ? "moment" : "moments"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
