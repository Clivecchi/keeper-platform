"use client"

/**
 * Orientation stays above the presentation.
 * It names the context, what is on Stage, and the presentations already entered.
 * The bar is a sibling of the Stage performance. KeeperDialogFrame mounts it.
 * Board surface: orientation.
 */

import type { StagePosture } from "@keeper/shared"
import { boardSurfaceProps } from "../boards/boardSurface"
import { buildStageOrientation } from "./stageOrientation"
import { useKeeperStageOptional } from "./useKeeperStage"
import { useStagePass } from "./stagePass"
import { useStagePresentationOptional } from "./stagePresentation"

export function StageOrientationBar({
  names,
  shellDomainId,
}: {
  names: Readonly<Record<string, string>>
  shellDomainId: string | null
}) {
  const pass = useStagePass()
  const stage = useKeeperStageOptional()
  const story = useStagePresentationOptional()
  const arrangement = stage?.stage.arrangements?.[pass.truth]
  const slideTitle = pass.truth === "story" ? story?.current?.title ?? null : null
  const orientation = buildStageOrientation({
    visits: pass.visits,
    cursor: pass.cursor,
    presentation: pass.presentation,
    audience: pass.context.audience,
    arriving: pass.context.arriving,
    shellDomainId,
    names,
    slideTitle,
  })
  const showPath = orientation.steps.length > 1

  return (
    <nav
      aria-label="Stage orientation"
      {...boardSurfaceProps("orientation")}
      data-stage-orientation=""
      data-stage-context={orientation.contextLabel}
      data-stage-on={orientation.onStageLabel}
      className="flex shrink-0 flex-col gap-2 border-b px-6 py-3"
      style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
    >
      <p className="text-[13px] leading-snug" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        <span style={{ color: "hsl(var(--theme-ink-primary))" }}>{orientation.contextLabel}</span>
        <span aria-hidden> · </span>
        <span>{orientation.onStageLabel}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <PostureButton current={pass.posture} posture="presentation" onSelect={pass.setPosture} />
        <PostureButton current={pass.posture} posture="workshop" onSelect={pass.setPosture} />
        {pass.posture === "workshop" && arrangement ? (
          <button
            type="button"
            className="text-[13px] leading-snug"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
            onClick={() => stage?.restoreArrangement(pass.truth)}
          >
            Restore
          </button>
        ) : null}
      </div>
      {showPath ? (
        <ol className="flex flex-wrap items-center gap-2">
          {orientation.steps.map((step, index) => {
            const current = step.id === orientation.currentStepId
            return (
              <li key={step.id} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                    /
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => {
                    if (!current) pass.presentStep(step)
                  }}
                  className="text-[13px] leading-snug"
                  style={{
                    color: current
                      ? "hsl(var(--theme-ink-primary))"
                      : "hsl(var(--theme-ink-secondary))",
                  }}
                >
                  {step.label}
                </button>
              </li>
            )
          })}
        </ol>
      ) : null}
    </nav>
  )
}

function PostureButton({
  current,
  posture,
  onSelect,
}: {
  current: StagePosture
  posture: StagePosture
  onSelect: (posture: StagePosture) => void
}) {
  const selected = current === posture
  const label = posture === "presentation" ? "Presentation" : "Workshop"
  return (
    <button
      type="button"
      aria-pressed={selected}
      className="text-[13px] leading-snug"
      style={{ color: selected ? "hsl(var(--theme-ink-primary))" : "hsl(var(--theme-ink-secondary))" }}
      onClick={() => onSelect(posture)}
    >
      {label}
    </button>
  )
}
