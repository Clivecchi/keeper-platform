"use client"

import * as React from "react"
import { DraftPointsSection } from "../DraftPointsSection"
import { DraftSessionsBlock } from "./DraftSessionsBlock"
import { DraftVersionStrip } from "./DraftVersionStrip"

function BlockSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
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

export interface DraftChronicleBlocksProps {
  domainId: string
  draftId: string
  spec: unknown
  summary?: string | null
  dialogId?: string | null
  presenceRefreshKey?: number
  onAcceptPoint?: (draftId: string, pointId: string) => void
  onDiscussPoint?: (draftId: string, pointId: string) => void
  acceptingPointId?: string | null
  acceptedPointIds?: Set<string>
  onDialogSelect?: (dialogId: string) => void
  onSessionSelect?: (sessionId: string) => void
}

export function DraftChronicleBlocks({
  domainId,
  draftId,
  spec,
  summary,
  dialogId,
  presenceRefreshKey = 0,
  onAcceptPoint,
  onDiscussPoint,
  acceptingPointId,
  acceptedPointIds,
  onDialogSelect,
  onSessionSelect,
}: DraftChronicleBlocksProps) {
  return (
    <>
      {summary?.trim() ? (
        <BlockSection title="Summary">
          <p
            className="text-[14px] leading-relaxed whitespace-pre-wrap"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {summary.trim()}
          </p>
        </BlockSection>
      ) : null}

      <BlockSection title="Points">
        <DraftPointsSection
          spec={spec}
          draftId={draftId}
          onAcceptPoint={onAcceptPoint}
          onDiscussPoint={onDiscussPoint}
          acceptingPointId={acceptingPointId}
          acceptedPointIds={acceptedPointIds}
        />
      </BlockSection>

      <BlockSection title="Versions">
        <DraftVersionStrip
          domainId={domainId}
          draftId={draftId}
          refreshKey={presenceRefreshKey}
        />
      </BlockSection>

      {dialogId && onDialogSelect ? (
        <BlockSection title="Linked dialog">
          <button
            type="button"
            onClick={() => onDialogSelect(dialogId)}
            className="text-[13px] font-medium underline transition-opacity hover:opacity-80 mb-3 block"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
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
        <BlockSection title="Sessions">
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
