"use client"

/**
 * KeeperViewPanel
 *
 * Right-panel view for IDE Board and Domain Board when a Keeper is in focus.
 * Surfaces session resumption, journey navigation, and full CRUD actions.
 *
 * Three sections:
 *   1 — Keeper identity (name editable, description editable, delete action)
 *   2 — Recent Sessions (hover: edit + delete, inline rename, inline delete confirm, New Session)
 *   3 — Active Journeys (hover: delete, inline delete confirm, tap to open)
 */

import * as React from "react"
import { Pencil, Trash2, Plus } from "lucide-react"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeeperViewSession {
  id: string
  title: string
  updatedAt: string
}

export interface KeeperViewJourney {
  id: string
  title: string
  momentCount: number
}

export interface KeeperViewPanelProps {
  keeper: { name: string; description?: string | null }
  /** ID of the keeper — required for rename/delete actions */
  keeperId?: string | null
  recentSessions: KeeperViewSession[]
  activeJourneys: KeeperViewJourney[]
  onSessionSelect: (id: string) => void
  onJourneySelect: (id: string) => void
  /** Called after keeper is deleted so parent can navigate away */
  onKeeperDeleted?: () => void
  /** Called after a session is deleted so parent can refresh nav */
  onSessionDeleted?: (id: string) => void
  /** Called after a journey is deleted so parent can refresh list */
  onJourneyDeleted?: (id: string) => void
  /** Called when "New Session" is clicked */
  onNewSession?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diffMs = Date.now() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 2) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours === 1 ? "1h" : `${diffHours}h`} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return "yesterday"
  if (diffDays < 14) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3 text-[10px] font-semibold uppercase tracking-widest"
      style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        color: "hsl(var(--theme-ink-tertiary))",
      }}
    >
      {children}
    </p>
  )
}

function SectionRule() {
  return (
    <div
      className="my-5"
      style={{ height: 1, background: "hsl(var(--theme-line-hairline) / 0.45)" }}
    />
  )
}

// ─── InlineDeleteConfirm ─────────────────────────────────────────────────────
// Inline "Delete?" row with Confirm / Cancel — no modal.

interface InlineDeleteConfirmProps {
  label: string
  onConfirm: () => void
  onCancel: () => void
  error?: string | null
}

function InlineDeleteConfirm({ label, onConfirm, onCancel, error }: InlineDeleteConfirmProps) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg px-3 py-2.5"
      style={{ background: "hsl(var(--theme-surface-paper) / 0.7)", border: "1px solid hsl(var(--theme-line-hairline))" }}
    >
      <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {label}
      </p>
      {error && (
        <p className="text-[11px]" style={{ color: "hsl(0 70% 50%)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onConfirm}
          className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-opacity hover:opacity-80"
          style={{ background: "hsl(0 60% 50%)", color: "#fff" }}
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] px-2.5 py-1 rounded-md transition-opacity hover:opacity-70"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── SessionRow ───────────────────────────────────────────────────────────────

interface SessionRowProps {
  session: KeeperViewSession
  onSelect: () => void
  onDelete: () => Promise<void>
  onRename: (name: string) => Promise<void>
}

function SessionRow({ session, onSelect, onDelete, onRename }: SessionRowProps) {
  const [hovered, setHovered] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [renaming, setRenaming] = React.useState(false)
  const [renameDraft, setRenameDraft] = React.useState(session.title)

  const when = relativeTime(session.updatedAt)

  const handleConfirmDelete = async () => {
    setDeleteError(null)
    try {
      await onDelete()
    } catch {
      setDeleteError("Delete failed — try again")
    }
  }

  const commitRename = async () => {
    const trimmed = renameDraft.trim()
    setRenaming(false)
    if (!trimmed || trimmed === session.title) return
    try {
      await onRename(trimmed)
    } catch {
      setRenameDraft(session.title)
    }
  }

  if (confirmDelete) {
    return (
      <InlineDeleteConfirm
        label={`Delete "${session.title}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmDelete(false); setDeleteError(null) }}
        error={deleteError}
      />
    )
  }

  if (renaming) {
    return (
      <input
        autoFocus
        type="text"
        value={renameDraft}
        onChange={(e) => setRenameDraft(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitRename()
          if (e.key === "Escape") { setRenameDraft(session.title); setRenaming(false) }
        }}
        className="w-full text-[13px] rounded-lg px-3 py-2.5 outline-none"
        style={{
          background: "hsl(var(--theme-surface-paper))",
          border: "1px solid hsl(var(--theme-ink-primary) / 0.2)",
          color: "hsl(var(--theme-ink-primary))",
        }}
      />
    )
  }

  return (
    <div
      className="group relative flex items-baseline justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors"
      style={{
        background: hovered
          ? "hsl(var(--theme-surface-paper) / 0.85)"
          : "hsl(var(--theme-surface-paper) / 0.50)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left"
      >
        <span
          className="block text-[13px] font-medium leading-snug truncate"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {session.title}
        </span>
      </button>

      {/* Timestamp (hides on hover to make room for actions) */}
      {!hovered && when && (
        <span
          className="shrink-0 text-[10px] whitespace-nowrap tabular-nums"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {when}
        </span>
      )}

      {/* Hover actions */}
      {hovered && (
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            title="Rename"
            onClick={() => { setRenameDraft(session.title); setRenaming(true) }}
            className="rounded p-1 transition-opacity hover:opacity-70"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            <Pencil size={11} />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => setConfirmDelete(true)}
            className="rounded p-1 transition-opacity hover:opacity-70"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── JourneyRow ──────────────────────────────────────────────────────────────

interface JourneyRowProps {
  journey: KeeperViewJourney
  onSelect: () => void
  onDelete: () => Promise<void>
}

function JourneyRow({ journey, onSelect, onDelete }: JourneyRowProps) {
  const [hovered, setHovered] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const countLabel = `${journey.momentCount} ${journey.momentCount === 1 ? "moment" : "moments"}`

  const handleConfirmDelete = async () => {
    setDeleteError(null)
    try {
      await onDelete()
    } catch {
      setDeleteError("Delete failed — try again")
    }
  }

  if (confirmDelete) {
    return (
      <InlineDeleteConfirm
        label={`Delete "${journey.title}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmDelete(false); setDeleteError(null) }}
        error={deleteError}
      />
    )
  }

  return (
    <div
      className="group relative flex items-baseline justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors"
      style={{
        background: hovered
          ? "hsl(var(--theme-surface-paper) / 0.85)"
          : "hsl(var(--theme-surface-paper) / 0.50)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left"
      >
        <span
          className="block text-[13px] font-medium leading-snug truncate"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {journey.title}
        </span>
      </button>

      {!hovered && (
        <span
          className="shrink-0 text-[10px] whitespace-nowrap tabular-nums"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {countLabel}
        </span>
      )}

      {hovered && (
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            title="Delete"
            onClick={() => setConfirmDelete(true)}
            className="rounded p-1 transition-opacity hover:opacity-70"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KeeperViewPanel({
  keeper,
  keeperId,
  recentSessions,
  activeJourneys,
  onSessionSelect,
  onJourneySelect,
  onKeeperDeleted,
  onSessionDeleted,
  onJourneyDeleted,
  onNewSession,
}: KeeperViewPanelProps) {
  // Local state — optimistic lists, initialized from props
  const [sessions, setSessions] = React.useState<KeeperViewSession[]>(recentSessions.slice(0, 3))
  const [journeys, setJourneys] = React.useState<KeeperViewJourney[]>(activeJourneys)

  // Sync when parent props change (e.g. nav refresh)
  React.useEffect(() => {
    setSessions(recentSessions.slice(0, 3))
  }, [recentSessions])

  React.useEffect(() => {
    setJourneys(activeJourneys)
  }, [activeJourneys])

  // Keeper title inline edit
  const [editingTitle, setEditingTitle] = React.useState(false)
  const [titleDraft, setTitleDraft] = React.useState(keeper.name)
  const [keeperTitle, setKeeperTitle] = React.useState(keeper.name)

  React.useEffect(() => {
    setKeeperTitle(keeper.name)
    setTitleDraft(keeper.name)
  }, [keeper.name])

  const saveTitle = async () => {
    const trimmed = titleDraft.trim()
    setEditingTitle(false)
    if (!trimmed || trimmed === keeperTitle || !keeperId) return
    const prev = keeperTitle
    setKeeperTitle(trimmed)
    try {
      await apiFetch(`/api/keepers/${keeperId}`, {
        method: "PUT",
        body: JSON.stringify({ title: trimmed }),
      })
    } catch {
      setKeeperTitle(prev)
      setTitleDraft(prev)
    }
  }

  // Keeper description inline edit
  const [editingDesc, setEditingDesc] = React.useState(false)
  const [descDraft, setDescDraft] = React.useState(keeper.description ?? "")
  const [keeperDesc, setKeeperDesc] = React.useState(keeper.description ?? "")

  React.useEffect(() => {
    setKeeperDesc(keeper.description ?? "")
    setDescDraft(keeper.description ?? "")
  }, [keeper.description])

  const saveDesc = async () => {
    const trimmed = descDraft.trim()
    setEditingDesc(false)
    if (!keeperId) return
    const prev = keeperDesc
    setKeeperDesc(trimmed)
    try {
      await apiFetch(`/api/keepers/${keeperId}`, {
        method: "PUT",
        body: JSON.stringify({ purpose: trimmed }),
      })
    } catch {
      setKeeperDesc(prev)
      setDescDraft(prev)
    }
  }

  // Keeper delete — two-stage inline confirmation
  const [keeperDeleteStage, setKeeperDeleteStage] = React.useState<"none" | "first" | "second">("none")
  const [keeperDeleteError, setKeeperDeleteError] = React.useState<string | null>(null)

  const handleKeeperDelete = async () => {
    if (!keeperId) return
    setKeeperDeleteError(null)
    try {
      await KipApi.deleteKeeper(keeperId)
      onKeeperDeleted?.()
    } catch {
      setKeeperDeleteError("Delete failed — try again")
      setKeeperDeleteStage("none")
    }
  }

  // Session handlers
  const handleSessionDelete = async (id: string) => {
    const prev = sessions
    setSessions((s) => s.filter((x) => x.id !== id))
    try {
      await KipApi.deleteSession(id)
      onSessionDeleted?.(id)
    } catch {
      setSessions(prev)
      throw new Error("Delete failed")
    }
  }

  const handleSessionRename = async (id: string, name: string) => {
    setSessions((s) => s.map((x) => (x.id === id ? { ...x, title: name } : x)))
    try {
      await apiFetch("/api/kip/agents", {
        method: "PATCH",
        body: JSON.stringify({
          action: "updateSessionMetadata",
          sessionId: id,
          updates: { session_name: name },
        }),
      })
    } catch {
      setSessions((s) => s.map((x) => (x.id === id ? { ...x, title: name } : x)))
    }
  }

  // Journey handlers
  const handleJourneyDelete = async (id: string) => {
    const prev = journeys
    setJourneys((j) => j.filter((x) => x.id !== id))
    try {
      await KipApi.deleteJourney(id)
      onJourneyDeleted?.(id)
    } catch {
      setJourneys(prev)
      throw new Error("Delete failed")
    }
  }

  return (
    <div
      className="keeper-panel-scroll flex flex-col h-full min-h-0 overflow-y-auto"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* ── Section 1: Keeper identity ──────────────────────────────────────── */}
      <div className="px-5 pt-6">
        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle()
              if (e.key === "Escape") { setTitleDraft(keeperTitle); setEditingTitle(false) }
            }}
            className="w-full bg-transparent outline-none border-b"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "28px",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "hsl(var(--theme-ink-primary))",
              borderColor: "hsl(var(--theme-line-hairline))",
            }}
          />
        ) : (
          <button
            type="button"
            className="group flex items-center gap-2 w-full text-left"
            onClick={() => { if (keeperId) { setTitleDraft(keeperTitle); setEditingTitle(true) } }}
            title={keeperId ? "Click to edit" : undefined}
          >
            <p
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "28px",
                fontWeight: 600,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                color: "hsl(var(--theme-ink-primary))",
              }}
            >
              {keeperTitle}
            </p>
            {keeperId && (
              <Pencil
                size={13}
                className="shrink-0 opacity-0 group-hover:opacity-50 transition-opacity mt-1"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              />
            )}
          </button>
        )}

        {/* Description */}
        {editingDesc ? (
          <textarea
            autoFocus
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={saveDesc}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setDescDraft(keeperDesc); setEditingDesc(false) }
            }}
            rows={3}
            className="w-full mt-1.5 bg-transparent text-[13px] leading-relaxed resize-none outline-none border rounded px-2 py-1.5"
            style={{
              color: "hsl(var(--theme-ink-secondary))",
              borderColor: "hsl(var(--theme-line-hairline))",
            }}
          />
        ) : (
          <button
            type="button"
            className="group w-full text-left mt-1.5 flex items-start gap-1.5"
            onClick={() => { if (keeperId) { setDescDraft(keeperDesc); setEditingDesc(true) } }}
          >
            {keeperDesc.trim() ? (
              <p
                className="flex-1 text-[13px] leading-relaxed"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                {keeperDesc.trim()}
              </p>
            ) : keeperId ? (
              <p
                className="flex-1 text-[12px] leading-relaxed italic"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                No description — click to add
              </p>
            ) : null}
            {keeperId && keeperDesc.trim() && (
              <Pencil
                size={11}
                className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              />
            )}
          </button>
        )}

        {/* Keeper delete — two-stage */}
        {keeperId && (
          <div className="mt-3">
            {keeperDeleteStage === "none" && (
              <button
                type="button"
                onClick={() => setKeeperDeleteStage("first")}
                className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                <Trash2 size={10} />
                Delete Keeper
              </button>
            )}
            {keeperDeleteStage === "first" && (
              <div
                className="rounded-lg px-3 py-2.5 space-y-1"
                style={{ background: "hsl(var(--theme-surface-paper) / 0.7)", border: "1px solid hsl(var(--theme-line-hairline))" }}
              >
                <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                  Delete this Keeper?
                </p>
                <p className="text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  This will delete all associated sessions. Confirm?
                </p>
                {keeperDeleteError && (
                  <p className="text-[11px]" style={{ color: "hsl(0 70% 50%)" }}>
                    {keeperDeleteError}
                  </p>
                )}
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setKeeperDeleteStage("second")}
                    className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-opacity hover:opacity-80"
                    style={{ background: "hsl(0 60% 50%)", color: "#fff" }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => { setKeeperDeleteStage("none"); setKeeperDeleteError(null) }}
                    className="text-[11px] px-2.5 py-1 rounded-md transition-opacity hover:opacity-70"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {keeperDeleteStage === "second" && (
              <div
                className="rounded-lg px-3 py-2.5 space-y-1"
                style={{ background: "hsl(0 60% 50% / 0.08)", border: "1px solid hsl(0 60% 50% / 0.3)" }}
              >
                <p className="text-[12px] font-medium" style={{ color: "hsl(0 60% 45%)" }}>
                  Are you absolutely sure? This cannot be undone.
                </p>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={handleKeeperDelete}
                    className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-80"
                    style={{ background: "hsl(0 60% 45%)", color: "#fff" }}
                  >
                    Delete permanently
                  </button>
                  <button
                    type="button"
                    onClick={() => { setKeeperDeleteStage("none"); setKeeperDeleteError(null) }}
                    className="text-[11px] px-2.5 py-1 rounded-md transition-opacity hover:opacity-70"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <SectionRule />
      </div>

      {/* ── Section 2: Recent Sessions ──────────────────────────────────────── */}
      <div className="px-5">
        <SectionLabel>Recent Sessions</SectionLabel>

        {sessions.length === 0 ? (
          <p
            className="text-[12px] italic"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No sessions yet
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <SessionRow
                  session={s}
                  onSelect={() => onSessionSelect(s.id)}
                  onDelete={() => handleSessionDelete(s.id)}
                  onRename={(name) => handleSessionRename(s.id, name)}
                />
              </li>
            ))}
          </ul>
        )}

        {/* New Session button */}
        {onNewSession && (
          <button
            type="button"
            onClick={onNewSession}
            className="flex items-center gap-1.5 mt-3 text-[12px] transition-opacity hover:opacity-70"
            style={{ color: "hsl(172 55% 35%)" }}
          >
            <Plus size={12} />
            New Session
          </button>
        )}

        <SectionRule />
      </div>

      {/* ── Section 3: Active Journeys ──────────────────────────────────────── */}
      <div className="px-5 pb-8">
        <SectionLabel>Journeys</SectionLabel>

        {journeys.length === 0 ? (
          <p
            className="text-[12px] italic"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No journeys yet
          </p>
        ) : (
          <ul className="space-y-1">
            {journeys.map((j) => (
              <li key={j.id}>
                <JourneyRow
                  journey={j}
                  onSelect={() => onJourneySelect(j.id)}
                  onDelete={() => handleJourneyDelete(j.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default KeeperViewPanel
