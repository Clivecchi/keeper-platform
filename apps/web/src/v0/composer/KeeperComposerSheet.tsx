"use client"

/**
 * Reach — bring who or what you need onto Stage.
 * A Composer feature, not Composer. Composer is AgentComposer.
 */

import * as React from "react"
import { stagePresenceKindLabel, type StagePresenceKind } from "@keeper/shared"
import { apiFetch } from "../../lib/api"
import { useUniversalBoard } from "../boards/UniversalBoardContext"
import { fetchComposerCast, useKeeperStage, type ComposerCastAgent } from "./useKeeperStage"

type NavIndexItem = {
  kind: "dialog" | "draft" | "keeper" | "library"
  id: string
  title: string
  subtitle?: string
}

type PaletteRow = {
  key: string
  kind: StagePresenceKind
  objectId: string
  title: string
  subtitle?: string
  rail: "here" | "cast" | "recent"
}

const DEFAULT_AGENT_STAGE_ROLE: Record<string, string> = {
  kip: "Lead",
  cloud: "Technical Authority",
  rendr: "Design / Presence",
  ceox: "Strategy / Synthesis",
}

export function KeeperComposerSheet({ domainId }: { domainId: string }) {
  const { selection, actions, composerReachOpen } = useUniversalBoard()
  const stageApi = useKeeperStage()
  const [query, setQuery] = React.useState("")
  const [cast, setCast] = React.useState<ComposerCastAgent[]>([])
  const [recent, setRecent] = React.useState<NavIndexItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!composerReachOpen) return
    setQuery("")
    const t = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [composerReachOpen])

  React.useEffect(() => {
    if (!composerReachOpen || !domainId) return
    let cancelled = false
    setLoading(true)
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""
    void Promise.all([
      fetchComposerCast(domainId),
      apiFetch(`/api/domains/${encodeURIComponent(domainId)}/nav-index${qs}`) as Promise<{ items?: NavIndexItem[] }>,
    ])
      .then(([agents, index]) => {
        if (cancelled) return
        setCast(agents)
        setRecent(Array.isArray(index?.items) ? index.items : [])
      })
      .catch(() => {
        if (!cancelled) {
          setCast([])
          setRecent([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [composerReachOpen, domainId, query])

  const hereRows = React.useMemo<PaletteRow[]>(() => {
    const rows: PaletteRow[] = []
    if (selection.selectedDialogId) {
      const named = recent.find((item) => item.kind === "dialog" && item.id === selection.selectedDialogId)
      rows.push({
        key: `here-dialog-${selection.selectedDialogId}`,
        kind: "dialog",
        objectId: selection.selectedDialogId,
        title: named?.title ?? "Current Dialog",
        subtitle: "Talking in",
        rail: "here",
      })
    }
    if (selection.selectedDraftId) {
      const named = recent.find((item) => item.kind === "draft" && item.id === selection.selectedDraftId)
      rows.push({
        key: `here-draft-${selection.selectedDraftId}`,
        kind: "draft",
        objectId: selection.selectedDraftId,
        title: named?.title ?? "Current Draft",
        subtitle: "Working on",
        rail: "here",
      })
    }
    return rows
  }, [selection.selectedDialogId, selection.selectedDraftId, recent])

  const castRows = React.useMemo<PaletteRow[]>(() => {
    const q = query.trim().toLowerCase()
    return cast
      .filter((agent) => {
        if (!q) return true
        return (
          agent.name.toLowerCase().includes(q)
          || agent.slug.toLowerCase().includes(q)
          || (agent.purpose ?? "").toLowerCase().includes(q)
          || agent.role?.toLowerCase().includes(q)
        )
      })
      .map((agent) => ({
        key: `cast-${agent.id}`,
        kind: "agent" as const,
        objectId: agent.id,
        title: agent.name,
        subtitle: [agent.role, agent.purpose].filter(Boolean).join(" · ") || agent.slug,
        rail: "cast" as const,
      }))
  }, [cast, query])

  const recentRows = React.useMemo<PaletteRow[]>(() => {
    return recent.map((item) => ({
      key: `recent-${item.kind}-${item.id}`,
      kind: item.kind,
      objectId: item.id,
      title: item.title,
      subtitle: item.subtitle,
      rail: "recent" as const,
    }))
  }, [recent])

  const bringRow = (row: PaletteRow) => {
    const agent = row.kind === "agent" ? cast.find((a) => a.id === row.objectId) : null
    const presence = stageApi.bring({
      kind: row.kind,
      objectId: row.objectId,
      title: row.kind === "agent" ? (agent?.name ?? row.title) : row.title,
      contextualRole: agent ? (DEFAULT_AGENT_STAGE_ROLE[agent.slug] ?? null) : null,
    })
    actions.setWorkspaceSurface("stage")
    if (presence) {
      actions.onWorkTargetFromStage({ kind: presence.kind, objectId: presence.objectId })
    }
    actions.closeComposerReach()
  }

  if (!composerReachOpen) return null

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" role="dialog" aria-label="Reach">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close Reach"
        onClick={actions.closeComposerReach}
        style={{ background: "hsl(var(--theme-ink-primary) / 0.45)" }}
      />
      <div
        className="relative flex max-h-[78%] min-h-[52%] flex-col rounded-t-2xl"
        style={{
          background: "hsl(var(--theme-surface-paper) / 0.98)",
          color: "hsl(var(--theme-ink-primary))",
          boxShadow: "0 -12px 40px hsl(var(--theme-ink-primary) / 0.18)",
        }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full" style={{ background: "hsl(var(--theme-border-soft))" }} />
        <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              Reach
            </p>
            <h2 className="text-[17px] font-medium">Bring who or what you need</h2>
          </div>
          <button
            type="button"
            onClick={actions.closeComposerReach}
            className="rounded-md px-2 py-1 text-[13px]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Close
          </button>
        </header>
        <div className="px-4 pb-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Keeper"
            className="w-full rounded-xl px-3 py-2.5 text-[15px]"
            style={{
              background: "hsl(var(--theme-surface-panel) / 0.6)",
              border: "1px solid hsl(var(--theme-border-soft))",
              color: "hsl(var(--theme-ink-primary))",
            }}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <p className="py-6 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>Looking…</p>
          ) : (
            <>
              <Rail title="Here" rows={hereRows} onPick={bringRow} />
              <Rail title="Cast" rows={castRows} onPick={bringRow} />
              <Rail title="Recent" rows={recentRows} onPick={bringRow} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Rail({
  title,
  rows,
  onPick,
}: {
  title: string
  rows: PaletteRow[]
  onPick: (row: PaletteRow) => void
}) {
  if (rows.length === 0) return null
  return (
    <section className="mb-4">
      <h3
        className="mb-2 text-[11px] uppercase tracking-[0.08em]"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onPick(row)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left"
              style={{
                background: "hsl(var(--theme-surface-panel) / 0.45)",
                border: "1px solid hsl(var(--theme-border-soft))",
              }}
            >
              <span>
                <span className="block text-[14px] font-medium">{row.title}</span>
                {row.subtitle ? (
                  <span className="block text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                    {row.subtitle}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-[11px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                {stagePresenceKindLabel(row.kind)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
