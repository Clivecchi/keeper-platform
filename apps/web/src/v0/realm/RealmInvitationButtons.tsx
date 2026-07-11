"use client"

import * as React from "react"
import type { RealmInvitationId } from "./realmInvitations"

export interface RealmInvitationButtonsProps {
  invitations: Array<{ id: string; label: string }>
  onInvite: (id: RealmInvitationId) => void
  className?: string
}

/** Invitation doors inside a Dialog Response — max four. */
export function RealmInvitationButtons({
  invitations,
  onInvite,
  className = "",
}: RealmInvitationButtonsProps) {
  if (invitations.length === 0) return null

  return (
    <div
      className={["realm-invitation-buttons flex flex-wrap gap-2 mt-3 pt-3", className].join(" ")}
      style={{ borderTop: "1px solid hsl(var(--theme-border-soft) / 0.45)" }}
      role="group"
      aria-label="Invitations"
    >
      {invitations.map((inv) => (
        <button
          key={inv.id}
          type="button"
          onClick={() => onInvite(inv.id as RealmInvitationId)}
          className="rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:opacity-90"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.65)",
            color: "hsl(var(--theme-ink-primary))",
            background: "hsl(var(--theme-surface-elevated) / 0.92)",
          }}
        >
          {inv.label}
        </button>
      ))}
    </div>
  )
}
