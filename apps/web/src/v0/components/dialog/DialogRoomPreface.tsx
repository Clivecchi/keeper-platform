"use client"

import * as React from "react"
import type { DialogArrivalContext, DialogHumanMemberRow } from "@keeper/shared"
import { domainBoardPath } from "../../../lib/invitationReturn"

export interface DialogRoomPersonOption {
  userId: string
  name: string
}

export interface DialogRoomPrefaceProps {
  arrival: DialogArrivalContext | null
  people: DialogHumanMemberRow[]
  domainMembers: DialogRoomPersonOption[]
  onOpenPath: (path: string) => void
  onAddPerson?: (userId: string) => void
  onRemovePerson?: (userId: string) => void
}

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 36,
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
  background: "hsl(var(--theme-surface-elevated) / 0.92)",
  color: "hsl(var(--theme-ink-primary))",
  fontSize: 13,
}

export function DialogRoomPreface({
  arrival,
  people,
  domainMembers,
  onOpenPath,
  onAddPerson,
  onRemovePerson,
}: DialogRoomPrefaceProps) {
  const [addUserId, setAddUserId] = React.useState("")
  const present = new Set(people.map((person) => person.userId))
  const addable = domainMembers.filter((member) => !present.has(member.userId))
  const showArrival = Boolean(arrival)
  const showPeople = people.length > 0 || Boolean(onAddPerson && addable.length > 0)
  if (!showArrival && !showPeople) return null

  const leadName = arrival?.originLeadName?.trim() || "The inviting lead"
  const inviterName = arrival?.inviterName?.trim() || "They"
  const inviterInRoom = people.some(
    (person) => person.displayName.trim().toLowerCase() === inviterName.trim().toLowerCase(),
  )

  const doors: Array<{ key: string; label: string; detail: string; path: string }> = []
  if (arrival?.homeDirectory && arrival.sharedDialogId) {
    const origin = arrival.doors?.find((door) => door.domainId === arrival.originDomainId)
      ?? arrival.doors?.[0]
    if (origin) {
      doors.push({
        key: `shared-${arrival.sharedDialogId}`,
        label: "Open the introduction",
        detail: origin.domainName,
        path: domainBoardPath(origin.domainSlug, arrival.sharedDialogId),
      })
    }
  }
  for (const door of arrival?.doors ?? []) {
    doors.push({
      key: `domain-${door.domainId}`,
      label: door.domainName,
      detail: "Domain",
      path: domainBoardPath(door.domainSlug),
    })
  }
  for (const dialog of arrival?.assignedDialogs ?? []) {
    doors.push({
      key: `dialog-${dialog.dialogId}`,
      label: dialog.title,
      detail: dialog.domainName,
      path: domainBoardPath(dialog.domainSlug, dialog.dialogId),
    })
  }

  return (
    <section
      className="mb-4 rounded-xl px-3 py-3"
      style={{
        border: "1px solid hsl(var(--theme-border-soft) / 0.45)",
        background: "hsl(var(--theme-surface-paper) / 0.72)",
      }}
      aria-label={showArrival ? "Arrival" : "People in this Dialog"}
    >
      {showArrival ? (
        <div className="mb-3">
          <p
            className="text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
          >
            First Introduction
          </p>
          <p className="mt-1 font-serif text-[18px] leading-snug" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {inviterName} invited you. {leadName} is here to guide. Kip is beside them.
          </p>
          {arrival?.homeDirectory && !inviterInRoom ? (
            <p className="mt-1 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              {inviterName} is in the Dialogs you were invited into.
            </p>
          ) : null}
        </div>
      ) : (
        <p
          className="mb-2 text-[11px] uppercase tracking-[0.16em]"
          style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
        >
          People
        </p>
      )}

      {people.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {people.map((person) => (
            <span key={person.userId} style={chipStyle}>
              {person.displayName}
              {onRemovePerson ? (
                <button
                  type="button"
                  className="ml-2 text-[12px] underline"
                  onClick={() => onRemovePerson(person.userId)}
                >
                  Remove
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {doors.length > 0 ? (
        <div className="flex flex-col gap-2">
          {doors.map((door) => (
            <button
              key={door.key}
              type="button"
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left"
              style={{
                border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
                background: "hsl(var(--theme-surface-elevated) / 0.9)",
                color: "hsl(var(--theme-ink-primary))",
              }}
              onClick={() => onOpenPath(door.path)}
            >
              <span className="font-medium">{door.label}</span>
              <span className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                {door.detail}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {onAddPerson && addable.length > 0 ? (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!addUserId) return
            onAddPerson(addUserId)
            setAddUserId("")
          }}
        >
          <label className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Add someone
            <select
              className="ml-2 min-h-11 rounded-md border px-2"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.55)",
                background: "hsl(var(--theme-surface-paper))",
                color: "hsl(var(--theme-ink-primary))",
              }}
              value={addUserId}
              onChange={(event) => setAddUserId(event.target.value)}
            >
              <option value="">Choose</option>
              {addable.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={!addUserId}
            className="min-h-11 rounded-md px-3 text-[13px]"
            style={{
              background: "hsl(var(--theme-ink-primary))",
              color: "hsl(var(--theme-surface-paper))",
              opacity: addUserId ? 1 : 0.45,
            }}
          >
            Add
          </button>
        </form>
      ) : null}
    </section>
  )
}
