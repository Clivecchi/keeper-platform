"use client"

import * as React from "react"
import { buildDraftSummaryFromAcceptedPoints } from "@keeper/shared"
import { DraftPointsSection } from "../DraftPointsSection"
import { DraftSessionsBlock } from "./DraftSessionsBlock"
import { DraftVersionStrip } from "./DraftVersionStrip"
import type { DraftPathEmergence } from "./draftManuscriptUtils"

function ManuscriptSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="cdraft-section-label">{children}</p>
}

function BlockSection({
  title,
  children,
  manuscript = false,
}: {
  title: string
  children: React.ReactNode
  manuscript?: boolean
}) {
  if (manuscript) {
    return (
      <div className="cdraft-secondary-block">
        <ManuscriptSectionLabel>{title}</ManuscriptSectionLabel>
        {children}
      </div>
    )
  }

  return (
    <div className="mb-5">
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-2.5"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function ManuscriptStoryArc({
  text,
  flashKey,
}: {
  text: string
  flashKey: number
}) {
  const beats = text.split(" → ").filter(Boolean)

  return (
    <div className="cdraft-story-arc" data-flash={flashKey}>
      {beats.length > 1 ? (
        <ol className="cdraft-story-arc-track">
          {beats.map((beat, index) => (
            <li key={`${beat}-${index}`} className="cdraft-story-arc-beat">
              <span className="cdraft-story-arc-index">{index + 1}</span>
              <span className="cdraft-story-arc-label">{beat}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cdraft-story-arc-single">{text}</p>
      )}
    </div>
  )
}

export interface DraftChronicleBlocksProps {
  domainId: string
  draftId: string
  spec: unknown
  summary?: string | null
  pathEmergence?: DraftPathEmergence[]
  summaryFlashKey?: number
  dialogId?: string | null
  presenceRefreshKey?: number
  onAcceptPoint?: (draftId: string, pointId: string) => void
  onDiscussPoint?: (draftId: string, pointId: string) => void
  onRewritePoint?: (draftId: string, pointId: string, preview: string) => void
  acceptingPointId?: string | null
  acceptedPointIds?: Set<string>
  onDialogSelect?: (dialogId: string) => void
  onSessionSelect?: (sessionId: string) => void
  manuscript?: boolean
}

export function DraftChronicleBlocks({
  domainId,
  draftId,
  spec,
  summary,
  pathEmergence = [],
  summaryFlashKey = 0,
  dialogId,
  presenceRefreshKey = 0,
  onAcceptPoint,
  onDiscussPoint,
  onRewritePoint,
  acceptingPointId,
  acceptedPointIds,
  onDialogSelect,
  onSessionSelect,
  manuscript = false,
}: DraftChronicleBlocksProps) {
  const displaySummary = React.useMemo(() => {
    if (!manuscript) return summary?.trim() || null
    const arc = buildDraftSummaryFromAcceptedPoints(spec)
    if (arc) return arc
    return summary?.trim() || null
  }, [manuscript, spec, summary])

  return (
    <>
      {displaySummary ? (
        manuscript ? (
          <ManuscriptStoryArc text={displaySummary} flashKey={summaryFlashKey} />
        ) : (
          <BlockSection title="Summary">
            <p
              className="text-[14px] leading-relaxed whitespace-pre-wrap"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {displaySummary}
            </p>
          </BlockSection>
        )
      ) : null}

      {manuscript ? (
        <div className="cdraft-points-zone">
          <ManuscriptSectionLabel>Points</ManuscriptSectionLabel>
          <DraftPointsSection
            spec={spec}
            draftId={draftId}
            pathEmergence={pathEmergence}
            onAcceptPoint={onAcceptPoint}
            onDiscussPoint={onDiscussPoint}
            onRewritePoint={onRewritePoint}
            acceptingPointId={acceptingPointId}
            acceptedPointIds={acceptedPointIds}
            manuscript
          />
        </div>
      ) : (
        <BlockSection title="Points">
          <DraftPointsSection
            spec={spec}
            draftId={draftId}
            onAcceptPoint={onAcceptPoint}
            onDiscussPoint={onDiscussPoint}
            onRewritePoint={onRewritePoint}
            acceptingPointId={acceptingPointId}
            acceptedPointIds={acceptedPointIds}
          />
        </BlockSection>
      )}

      <BlockSection title="Versions" manuscript={manuscript}>
        <DraftVersionStrip
          domainId={domainId}
          draftId={draftId}
          refreshKey={presenceRefreshKey}
        />
      </BlockSection>

      {dialogId && onDialogSelect ? (
        <BlockSection title="Linked dialog" manuscript={manuscript}>
          <button
            type="button"
            onClick={() => onDialogSelect(dialogId)}
            className={
              manuscript
                ? "cdraft-ghost-link mb-3 block"
                : "text-[13px] font-medium underline transition-opacity hover:opacity-80 mb-3 block"
            }
            style={
              manuscript
                ? undefined
                : { color: "hsl(var(--theme-ink-secondary))" }
            }
          >
            Open linked dialog →
          </button>
          <DraftSessionsBlock
            domainId={domainId}
            draftId={draftId}
            dialogId={dialogId}
            onSessionSelect={onSessionSelect}
          />
        </BlockSection>
      ) : (
        <BlockSection title="Sessions" manuscript={manuscript}>
          <DraftSessionsBlock
            domainId={domainId}
            draftId={draftId}
            dialogId={dialogId}
            onSessionSelect={onSessionSelect}
          />
        </BlockSection>
      )}
    </>
  )
}
