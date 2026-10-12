"use client"

/**
 * Orientation for the performance posture.
 * Place, the work in hand, and how that relates to what the stage is showing.
 * The stage canvas keeps the performance itself.
 */

import { boardSurfaceProps } from "../boardSurface"
import { useV0ShellOptional } from "../../shell/V0ShellContext"
import { useStagePresentationOptional } from "../../composer/stagePresentation"
import { resolveEnteredPlaceName } from "./stagePlace"

export function StageSceneHeader({
  workTitle,
  domainName,
}: {
  workTitle?: string | null
  domainName?: string | null
}) {
  const shell = useV0ShellOptional()
  const place = resolveEnteredPlaceName({
    shellMode: shell?.shellMode,
    homeDisplayName: shell?.homeDisplayName,
    domainName,
  })
  const presentation = useStagePresentationOptional()
  const performed = presentation?.performedFrame ?? null
  const work = workTitle?.trim() || ""
  const slideLine = performed
    ? `${performed.slideCount === 1 ? "1 slide" : `${performed.slideCount} slides`} · ${performed.title}`
    : ""

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
        {work && slideLine ? (
          <p className="mt-1 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {slideLine}
          </p>
        ) : null}
        {work && !performed ? (
          <p className="mt-1 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            No slides yet
          </p>
        ) : null}
      </div>
    </header>
  )
}
