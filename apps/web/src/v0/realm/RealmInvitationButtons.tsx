"use client"

import * as React from "react"
import type { RealmInvitationId } from "./realmInvitations"

export interface RealmInvitationButtonsProps {
  invitations: Array<{ id: string; label: string }>
  onInvite: (id: RealmInvitationId) => void
  className?: string
}

const STORY_CARD_LIMIT = 2
const INVITATION_PRIORITY: ReadonlyArray<RealmInvitationId> = [
  "thread",
  "drafts",
  "sessions",
  "feed",
]

const STORY_COPY: Record<
  RealmInvitationId,
  { eyebrow: string; title: string; detail: string }
> = {
  thread: {
    eyebrow: "Story in progress",
    title: "Pick up the thread",
    detail: "Continue the latest conversation where it left off.",
  },
  drafts: {
    eyebrow: "Draft in motion",
    title: "Rejoin your writing",
    detail: "Open the draft thread and keep shaping it.",
  },
  sessions: {
    eyebrow: "Session lane",
    title: "Switch active sessions",
    detail: "Move between current threads without losing context.",
  },
  feed: {
    eyebrow: "Realm pulse",
    title: "Review recent movement",
    detail: "Scan the latest activity across your connected domains.",
  },
}

function toRealmInvitationId(value: string): RealmInvitationId | null {
  if (value === "thread" || value === "feed" || value === "drafts" || value === "sessions") {
    return value
  }
  return null
}

/** Invitation doors inside a Dialog Response — max four. */
export function RealmInvitationButtons({
  invitations,
  onInvite,
  className = "",
}: RealmInvitationButtonsProps) {
  if (invitations.length === 0) return null

  const priority = React.useMemo(
    () => new Map(INVITATION_PRIORITY.map((id, idx) => [id, idx])),
    [],
  )

  const normalized = React.useMemo(
    () =>
      invitations
        .map((inv) => ({
          ...inv,
          realmId: toRealmInvitationId(inv.id),
        }))
        .filter(
          (
            inv,
          ): inv is {
            id: string
            label: string
            realmId: RealmInvitationId
          } => inv.realmId !== null,
        )
        .sort(
          (a, b) =>
            (priority.get(a.realmId) ?? Number.MAX_SAFE_INTEGER)
            - (priority.get(b.realmId) ?? Number.MAX_SAFE_INTEGER),
        ),
    [invitations, priority],
  )

  const featured = normalized.slice(0, STORY_CARD_LIMIT)
  const overflow = normalized.slice(STORY_CARD_LIMIT)

  return (
    <div
      className={["realm-invitation-buttons mt-3 space-y-2.5 pt-3", className].join(" ")}
      style={{ borderTop: "1px solid hsl(var(--theme-border-soft) / 0.45)" }}
      role="group"
      aria-label="Invitations"
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
      >
        Stories in progress
      </p>

      <div className="grid gap-2">
        {featured.map((inv) => {
          const copy = STORY_COPY[inv.realmId]
          return (
            <button
              key={inv.id}
              type="button"
              onClick={() => onInvite(inv.realmId)}
              className="w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors hover:opacity-95"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.62)",
                color: "hsl(var(--theme-ink-primary))",
                background: "hsl(var(--theme-surface-elevated) / 0.94)",
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
              >
                {copy.eyebrow}
              </p>
              <p className="mt-0.5 text-[13px] font-medium leading-tight">
                {copy.title}
              </p>
              <p
                className="mt-1 text-[11px] leading-snug"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                {copy.detail}
              </p>
              <p
                className="mt-1.5 text-[11px] font-medium"
                style={{ color: "hsl(var(--theme-ink-primary))" }}
              >
                {inv.label} →
              </p>
            </button>
          )
        })}
      </div>

      {overflow.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {overflow.map((inv) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => onInvite(inv.realmId)}
              className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:opacity-90"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.58)",
                color: "hsl(var(--theme-ink-primary))",
                background: "hsl(var(--theme-surface-elevated) / 0.9)",
              }}
            >
              {inv.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
