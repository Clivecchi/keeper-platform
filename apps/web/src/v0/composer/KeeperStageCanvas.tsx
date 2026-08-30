"use client"

/**
 * Keeper Stage — filmstrip of Slides (text_slide) plus object assets.
 * The Frame is the room. Each cell is a Slide. First Slide is the existing title.
 */

import * as React from "react"
import { stagePresenceKindLabel, type StagePresence } from "@keeper/shared"
import { useIsMobile } from "../../mobile/hooks/useIsMobile"
import { useUniversalBoard } from "../boards/UniversalBoardContext"
import type { AgentDialogueMessage } from "../../components/agent/types"
import { useBindStageDialog } from "./useBindStageDialog"
import { useKeeperStage } from "./useKeeperStage"
import { StageFilmstrip } from "./StageFilmstrip"
import { resolveStageFilmstrip } from "./stageFilmstrip"
import { resolveStageNowBeat } from "./stageNowBeat"

export function KeeperStageCanvas({
  domainId: _domainId,
  messages = [],
  userName = "You",
  agentName = "Kip",
  isSending = false,
  storyTitle = null,
  domainLabel = null,
}: {
  domainId: string | null
  messages?: ReadonlyArray<AgentDialogueMessage>
  userName?: string
  agentName?: string
  isSending?: boolean
  storyTitle?: string | null
  domainLabel?: string | null
}) {
  const isMobile = useIsMobile()
  const { actions } = useUniversalBoard()
  const stageApi = useKeeperStage()
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ id: string; ox: number; oy: number } | null>(null)
  useBindStageDialog()

  const selected = stageApi.selected
  const nowBeat = React.useMemo(
    () => resolveStageNowBeat(messages, { userName, agentName }),
    [messages, userName, agentName],
  )
  const filmstrip = React.useMemo(
    () =>
      resolveStageFilmstrip({
        stageTitle: stageApi.stage.title,
        storyTitle,
        domainLabel,
        beat: nowBeat,
        waiting: isSending,
      }),
    [stageApi.stage.title, storyTitle, domainLabel, nowBeat, isSending],
  )

  const onSelect = (presence: StagePresence) => {
    stageApi.select(presence.id)
    actions.onWorkTargetFromStage({ kind: presence.kind, objectId: presence.objectId })
  }

  const onPointerDown = (event: React.PointerEvent, presence: StagePresence) => {
    onSelect(presence)
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
    <div className="flex h-full min-h-0 flex-col" style={{ paddingBottom: 8 }}>
      {stageApi.saving ? (
        <div className="flex justify-end px-3 py-1">
          <span className="text-[11px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>Saving</span>
        </div>
      ) : null}

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
        ) : isMobile ? (
          <div className="flex flex-col items-center gap-3 overflow-y-auto p-3">
            <StageFilmstrip slides={filmstrip} />
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
            {stageApi.stage.presences.length === 0 ? (
              <ReachHint onOpenReach={actions.openComposerReach} />
            ) : null}
          </div>
        ) : (
          <>
            {stageApi.stage.presences.map((presence) => (
              <div
                key={presence.id}
                className="absolute"
                style={{
                  left: `${presence.x * 100}%`,
                  top: `${presence.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: "min(220px, 34%)",
                  zIndex: selected?.id === presence.id ? 4 : 3,
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
            ))}
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-8">
              <div className="pointer-events-auto">
                <StageFilmstrip slides={filmstrip} />
              </div>
            </div>
            {stageApi.stage.presences.length === 0 ? (
              <div className="absolute bottom-5 left-1/2 z-[2] -translate-x-1/2">
                <ReachHint onOpenReach={actions.openComposerReach} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function ReachHint({ onOpenReach }: { onOpenReach: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenReach}
      className="rounded-full px-4 py-2 text-[14px]"
      style={{
        background: "hsl(var(--theme-accent-primary) / 0.18)",
        color: "hsl(var(--theme-ink-primary))",
      }}
    >
      Open Reach
    </button>
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
        {selected ? (
          <p className="mt-2 text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Discussing in Chronicle
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
