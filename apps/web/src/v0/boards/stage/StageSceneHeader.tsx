"use client"

/**
 * Orientation for the performance posture.
 * Place, the work in hand, and how that relates to what the stage is showing.
 * The stage canvas keeps the performance itself.
 */

import { boardSurfaceProps } from "../boardSurface"
import { useUniversalBoardOptional } from "../UniversalBoardContext"
import { useV0ShellOptional } from "../../shell/V0ShellContext"
import { buildStageOrientation } from "../../composer/stageOrientation"
import { useStagePass } from "../../composer/stagePass"
import { resolveEnteredPlaceName } from "./stagePlace"

export function StageSceneHeader({
  workTitle,
  domainName,
}: {
  workTitle?: string | null
  domainName?: string | null
}) {
  const shell = useV0ShellOptional()
  const board = useUniversalBoardOptional()
  const pass = useStagePass()
  const place = resolveEnteredPlaceName({
    shellMode: shell?.shellMode,
    homeDisplayName: shell?.homeDisplayName,
    domainName,
  })
  const work = workTitle?.trim() || ""
  const orientation = buildStageOrientation({
    visits: pass.visits,
    cursor: pass.cursor,
    presentation: pass.presentation,
    audience: pass.context.audience,
    arriving: pass.context.arriving,
    shellDomainId: pass.context.domainId ?? null,
  })
  const cover = orientation.steps.find((step) => step.presentation === "where-we-are")
  const story = orientation.steps.find((step) => step.presentation === "story")
  const showSwitch = Boolean(cover && story)
  const relationship = !work
    ? null
    : pass.truth === "story"
      ? "The stage is showing the story."
      : "The stage is showing where we are."

  return (
    <header
      {...boardSurfaceProps("orientation")}
      data-stage-orientation=""
      className="flex shrink-0 items-start justify-between gap-4 px-6 pb-3 pt-4"
      style={{ borderBottom: "1px solid hsl(var(--theme-line-hairline))" }}
    >
      <div className="min-w-0">
        <p
          className="text-[11px] font-medium uppercase tracking-[0.14em]"
          style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
        >
          {place}
        </p>
        {work ? (
          <h1
            className="mt-1 truncate font-serif text-[1.65rem] font-medium leading-tight tracking-tight"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {work}
          </h1>
        ) : null}
        {relationship ? (
          <p className="mt-1 text-[13px] leading-snug" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {relationship}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-1">
        {showSwitch && cover ? (
          <HeaderAction
            pressed={orientation.currentStepId === cover.id}
            onClick={() => pass.presentStep(cover)}
          >
            Cover
          </HeaderAction>
        ) : null}
        {showSwitch && story ? (
          <HeaderAction
            pressed={orientation.currentStepId === story.id}
            onClick={() => pass.presentStep(story)}
          >
            Story
          </HeaderAction>
        ) : null}
        <HeaderAction onClick={() => board?.actions.leaveStageRoom()}>
          Conversation
        </HeaderAction>
      </div>
    </header>
  )
}

function HeaderAction({
  children,
  onClick,
  pressed,
}: {
  children: string
  onClick: () => void
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="rounded-full px-3 py-1 text-[13px] leading-snug"
      style={{
        color: pressed ? "hsl(var(--theme-ink-primary))" : "hsl(var(--theme-ink-secondary))",
        background: pressed ? "hsl(var(--theme-surface-panel) / 0.55)" : "transparent",
      }}
    >
      {children}
    </button>
  )
}
