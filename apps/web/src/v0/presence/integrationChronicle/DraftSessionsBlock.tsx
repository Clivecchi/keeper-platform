"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"

type DraftLinkedSession = {
  id: string
  label: string
  sub?: string
  isActiveForDraft: boolean
}

function formatWhen(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

function sessionLabel(session: Record<string, unknown>): string {
  const name =
    typeof session.session_name === "string" && session.session_name.trim()
      ? session.session_name.trim()
      : typeof session.sessionName === "string" && session.sessionName.trim()
        ? session.sessionName.trim()
        : null
  if (name) return name
  const id = typeof session.id === "string" ? session.id : ""
  return id ? `Session ${id.slice(0, 8)}` : "Session"
}

export function DraftSessionsBlock({
  domainId,
  draftId,
  dialogId,
  onSessionSelect,
}: {
  domainId: string
  draftId: string
  dialogId?: string | null
  onSessionSelect?: (sessionId: string) => void
}) {
  const [sessions, setSessions] = React.useState<DraftLinkedSession[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!dialogId) {
      setSessions([])
      setError(null)
      return
    }

    let cancelled = false
    setSessions(null)
    setError(null)

    void apiFetch(
      `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(dialogId)}`,
    )
      .then((res: unknown) => {
        if (cancelled) return
        const rows =
          (res as { dialog?: { sessions?: Array<Record<string, unknown>> } })?.dialog
            ?.sessions ?? []
        const mapped = rows
          .map((session) => {
            const id = typeof session.id === "string" ? session.id : null
            if (!id) return null
            const activeDraftId =
              (session.active_draft_id as string | null | undefined)
              ?? (session.activeDraftId as string | null | undefined)
              ?? null
            return {
              id,
              label: sessionLabel(session),
              sub: formatWhen(session.updated_at ?? session.updatedAt ?? session.created_at),
              isActiveForDraft: activeDraftId === draftId,
            } satisfies DraftLinkedSession
          })
          .filter((row): row is DraftLinkedSession => row !== null)
          .sort((a, b) => Number(b.isActiveForDraft) - Number(a.isActiveForDraft))

        setSessions(mapped)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sessions")
          setSessions([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [domainId, draftId, dialogId])

  if (!dialogId) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Link a Dialog to this draft to resume related sessions here.
      </p>
    )
  }

  if (error) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--destructive))" }}>
        {error}
      </p>
    )
  }

  if (!sessions) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Loading sessions…
      </p>
    )
  }

  if (sessions.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        No sessions on the linked Dialog yet.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {sessions.map((session) => (
        <li key={session.id}>
          <button
            type="button"
            onClick={() => onSessionSelect?.(session.id)}
            disabled={!onSessionSelect}
            className="w-full text-left rounded-lg border px-3 py-2.5 transition-all hover:opacity-90 disabled:cursor-default"
            style={{
              borderColor: session.isActiveForDraft
                ? "hsl(var(--theme-border-soft) / 0.75)"
                : "hsl(var(--theme-border-soft) / 0.45)",
              background: session.isActiveForDraft
                ? "hsl(var(--theme-surface-elevated) / 0.42)"
                : "hsl(var(--theme-surface-elevated) / 0.28)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p
                className="text-[14px] font-medium leading-snug"
                style={{ color: "hsl(var(--theme-ink-primary))" }}
              >
                {session.label}
              </p>
              {session.isActiveForDraft ? (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: "hsl(var(--theme-surface-elevated))",
                    color: "hsl(var(--theme-ink-secondary))",
                    border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
                  }}
                >
                  Active draft
                </span>
              ) : null}
            </div>
            {session.sub ? (
              <p
                className="text-[12px] mt-1"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                {session.sub}
              </p>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  )
}
