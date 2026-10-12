"use client"

import * as React from "react"
import { performedStagePresenceId, stagePresenceKindLabel, type StagePresence } from "@keeper/shared"
import { useStagePresentationOptional } from "./stagePresentation"
import { useUniversalBoard } from "../boards/UniversalBoardContext"
import { useKeeperStageOptional } from "./useKeeperStage"

export function OnStageObjectList({
  layout,
}: {
  layout: "chronicle" | "reach"
}) {
  const { actions, selection, workspaceSurface } = useUniversalBoard()
  const stageApi = useKeeperStageOptional()
  const presentation = useStagePresentationOptional()
  if (!stageApi || workspaceSurface !== "stage") return null
  if (stageApi.stage.presences.length === 0) return null

  const performedId = performedStagePresenceId(
    stageApi.stage.presences,
    selection.selectedDialogId,
    stageApi.selected?.id ?? null,
  )

  const pick = (presence: StagePresence) => {
    stageApi.select(presence.id)
    actions.onWorkTargetFromStage({ kind: presence.kind, objectId: presence.objectId })
    if (layout === "reach") actions.closeComposerReach()
  }

  return (
    <section
      className={layout === "chronicle" ? "shrink-0 px-3 pb-2 pt-3" : "mb-4"}
      aria-label="On Stage"
      style={
        layout === "chronicle"
          ? { borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.35)" }
          : undefined
      }
    >
      <h3
        className="mb-2 text-[11px] uppercase tracking-[0.08em]"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        On Stage
      </h3>
      <p className="mb-2 text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        {presentation?.stageReading === "filmstrip"
          ? "Sources placed here. The canvas is the Stage filmstrip, not a Story."
          : "Sources placed here. The canvas is the Dialog in hand."}
      </p>
      <ul className="flex flex-col gap-1">
        {stageApi.stage.presences.map((presence) => {
          const on = performedId === presence.id
          return (
            <li
              key={presence.id}
              className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5"
              style={{
                background: on
                  ? "hsl(var(--theme-accent-primary) / 0.14)"
                  : "transparent",
              }}
            >
              <button
                type="button"
                onClick={() => pick(presence)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block text-[14px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                  {presence.title}
                </span>
                <span className="block text-[11px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                  {stagePresenceKindLabel(presence.kind)}
                  {presence.contextualRole ? ` · ${presence.contextualRole}` : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => stageApi.remove(presence.id)}
                className="shrink-0 text-[11px]"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                Remove
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
