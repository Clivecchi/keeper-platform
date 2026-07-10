"use client"

import * as React from "react"
import type { RealmFeedCounts } from "@keeper/shared"

export type RealmInvitationId = "thread" | "feed" | "drafts" | "sessions"

export interface RealmInvitation {
  id: RealmInvitationId
  label: string
  visible: boolean
}

export interface RealmInvitationBarProps {
  counts: RealmFeedCounts
  onInvite: (id: RealmInvitationId) => void
}

const MAX_INVITATIONS = 4

function buildInvitations(counts: RealmFeedCounts): RealmInvitation[] {
  const candidates: RealmInvitation[] = [
    {
      id: "thread",
      label: "Pick up the thread",
      visible: counts.sessions > 0,
    },
    {
      id: "feed",
      label: "Realm feed",
      visible: counts.domains > 0,
    },
    {
      id: "drafts",
      label: counts.drafts === 1 ? "Draft waiting" : "Drafts waiting",
      visible: counts.drafts > 0,
    },
    {
      id: "sessions",
      label: "Sessions",
      visible: counts.sessions > 1,
    },
  ]

  const visible = candidates.filter((c) => c.visible)
  if (visible.length === 0) {
    return [{ id: "feed", label: "Realm feed", visible: true }]
  }
  return visible.slice(0, MAX_INVITATIONS)
}

export function RealmInvitationBar({ counts, onInvite }: RealmInvitationBarProps) {
  const invitations = React.useMemo(() => buildInvitations(counts), [counts])

  return (
    <div
      className="realm-invitation-bar flex flex-wrap gap-2 px-4 pb-3"
      role="group"
      aria-label="Invitations"
    >
      {invitations.map((inv) => (
        <button
          key={inv.id}
          type="button"
          onClick={() => onInvite(inv.id)}
          className="rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:opacity-90"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.65)",
            color: "hsl(var(--theme-ink-primary))",
            background: "hsl(var(--theme-surface-elevated) / 0.75)",
          }}
        >
          {inv.label}
        </button>
      ))}
    </div>
  )
}
