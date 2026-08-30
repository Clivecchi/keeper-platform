"use client"

/**
 * Keeper Stage — spatial composition of real object references.
 * Positions persist on the Stage. Theatre.js is not the source of truth.
 */

import * as React from "react"
import { stagePresenceKindLabel, type StagePresence } from "@keeper/shared"
import { useIsMobile } from "../../mobile/hooks/useIsMobile"
import { useUniversalBoard } from "../boards/UniversalBoardContext"
import { StageAgencyStrip } from "./StageAgencyStrip"
import { fetchComposerCast, useKeeperStage, type ComposerCastAgent } from "./useKeeperStage"

export function KeeperStageCanvas({ domainId }: { domainId: string | null }) {
  const isMobile = useIsMobile()
  const { actions } = useUniversalBoard()
  const stageApi = useKeeperStage()
  const [cast, setCast] = React.useState<ComposerCastAgent[]>([])
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ id: string; ox: number; oy: number } | null>(null)

  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    void fetchComposerCast(domainId).then((agents) => {
      if (!cancelled) setCast(agents)
    })
    return () => {
      cancelled = true
    }
  }, [domainId])

  const selected = stageApi.selected
  const selectedAgent =
    selected?.kind === "agent" ? cast.find((a) => a.id === selected.objectId) ?? null : null

  const onSelect = (presence: StagePresence) => {
    stageApi.select(presence.id)
    actions.onWorkTargetFromStage({ kind: presence.kind, objectId: presence.objectId })
  }

  const onPointerDown = (event: React.PointerEvent, presence: StagePresence) => {
    if (isMobile) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    drag.current = {
      id: presence.id,
      ox: event.clientX - (presence.x * rect.width),
      oy: event.clientY - (presence.y * rect.height),
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.min(0.92, Math.max(0.04, (event.clientX - drag.current.ox) / rect.width))
    const y = Math.min(0.88, Math.max(0.06, (event.clientY - drag.current.oy) / rect.height))
    stageApi.move(drag.current.id, x, y)
  }

  const onPointerUp = () => {
    drag.current = null
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Stage
          </p>
          <h2 className="text-[16px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {stageApi.stage.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {stageApi.saving ? (
            <span className="text-[11px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>Saving</span>
          ) : null}
          <button
            type="button"
            onClick={actions.openComposerReach}
            className="rounded-full px-3 py-1.5 text-[13px]"
            style={{
              background: "hsl(var(--theme-accent-primary) / 0.16)",
              color: "hsl(var(--theme-ink-primary))",
              border: "1px solid hsl(var(--theme-border-soft))",
            }}
          >
            Reach
          </button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ background: "hsl(var(--theme-surface-panel) / 0.18)" }}
      >
        {stageApi.loading ? (
          <p className="p-4 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Loading Stage…
          </p>
        ) : stageApi.stage.presences.length === 0 ? (
          <EmptyStage onOpenComposer={actions.openComposerReach} />
        ) : isMobile ? (
          <div className="flex flex-col gap-2 overflow-y-auto p-3">
            {stageApi.stage.presences.map((presence) => (
              <PresenceCard
                key={presence.id}
                presence={presence}
                selected={selected?.id === presence.id}
                stacked
                onSelect={() => onSelect(presence)}
                onRemove={() => stageApi.remove(presence.id)}
              />
            ))}
          </div>
        ) : (
          stageApi.stage.presences.map((presence) => (
            <div
              key={presence.id}
              className="absolute"
              style={{
                left: `${presence.x * 100}%`,
                top: `${presence.y * 100}%`,
                transform: "translate(-50%, -50%)",
                width: "min(240px, 42%)",
              }}
              onPointerDown={(e) => onPointerDown(e, presence)}
            >
              <PresenceCard
                presence={presence}
                selected={selected?.id === presence.id}
                onSelect={() => onSelect(presence)}
                onRemove={() => stageApi.remove(presence.id)}
              />
            </div>
          ))
        )}
      </div>

      {selected?.kind === "agent" ? (
        <StageAgencyStrip
          presence={selected}
          agent={selectedAgent}
          onChange={(patch) => stageApi.updateAgency(selected.id, patch)}
        />
      ) : selected ? (
        <div
          className="px-4 py-3 text-[13px]"
          style={{
            borderTop: "1px solid hsl(var(--theme-border-soft))",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          Working on {stagePresenceKindLabel(selected.kind)} “{selected.title}”. Talking in stays where it is.
        </div>
      ) : null}
    </div>
  )
}

function EmptyStage({ onOpenComposer }: { onOpenComposer: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[15px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        This is Keeper Stage.
      </p>
      <p className="max-w-sm text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Open Reach from Composer. Find Kip. Bring a real object — Finding the Plot if it is here. Nothing on Stage is a copy.
      </p>
      <button
        type="button"
        onClick={onOpenComposer}
        className="rounded-full px-4 py-2 text-[14px]"
        style={{
          background: "hsl(var(--theme-accent-primary) / 0.18)",
          color: "hsl(var(--theme-ink-primary))",
        }}
      >
        Open Reach
      </button>
    </div>
  )
}

function PresenceCard({
  presence,
  selected,
  stacked,
  onSelect,
  onRemove,
}: {
  presence: StagePresence
  selected: boolean
  stacked?: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  return (
    <article
      className={stacked ? "w-full" : "w-full cursor-grab"}
      style={{
        borderRadius: 14,
        border: selected
          ? "1px solid hsl(var(--theme-accent-primary))"
          : "1px solid hsl(var(--theme-border-soft))",
        background: "hsl(var(--theme-surface-paper) / 0.94)",
        padding: "10px 12px",
      }}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <p className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {stagePresenceKindLabel(presence.kind)}
          {presence.contextualRole ? ` · ${presence.contextualRole}` : ""}
        </p>
        <h3 className="text-[15px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
          {presence.title}
        </h3>
        {presence.direction ? (
          <p className="mt-1 text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {presence.direction}
          </p>
        ) : null}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 text-[11px]"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        Remove from Stage
      </button>
    </article>
  )
}
