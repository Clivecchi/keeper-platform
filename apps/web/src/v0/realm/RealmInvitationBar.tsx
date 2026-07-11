"use client"

import * as React from "react"
import type { RealmFeedCounts } from "@keeper/shared"
import type { RealmInvitationId } from "./realmInvitations"
import { buildRealmInvitations } from "./realmInvitations"

export type { RealmInvitationId } from "./realmInvitations"

export interface RealmInvitationBarProps {
  counts: RealmFeedCounts
  onInvite: (id: RealmInvitationId) => void
}

/** @deprecated Invitations render inside the Dialog Response — use RealmInvitationButtons. */
export function RealmInvitationBar({ counts, onInvite }: RealmInvitationBarProps) {
  const invitations = React.useMemo(() => buildRealmInvitations(counts), [counts])

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
