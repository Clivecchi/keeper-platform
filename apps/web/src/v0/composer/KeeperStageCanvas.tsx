"use client"

/**
 * Keeper Stage — the place Keeper presents.
 * Arrival may show "Where are we?" instead of the story filmstrip.
 */

import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { useBindStageDialog } from "./useBindStageDialog"
import { StagePresentationScreen } from "./StageFilmstrip"
import { useKeeperStageOptional } from "./useKeeperStage"
import { useStageArrivalPresentation } from "./useStageArrivalPresentation"
import { WhereWeAreStage } from "./WhereWeAreStage"

export function KeeperStageCanvas({ domainId }: { domainId: string | null }) {
  const board = useUniversalBoardOptional()
  const presentation = useStageArrivalPresentation()

  if (presentation === "where-we-are") {
    return (
      <WhereWeAreStage
        domainId={domainId}
        onContinue={(dialogId) => board?.actions.onDialogSelect(dialogId)}
      />
    )
  }

  return <StoryStageCanvas />
}

function StoryStageCanvas() {
  useBindStageDialog()
  const stageApi = useKeeperStageOptional()

  return (
    <div className="flex h-full min-h-0 flex-col">
      {stageApi?.saving ? (
        <div className="flex justify-end px-3 py-1">
          <span className="text-[11px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>Saving</span>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        {stageApi?.loading ? (
          <p className="p-4 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Loading Stage…
          </p>
        ) : (
          <StagePresentationScreen />
        )}
      </div>
    </div>
  )
}
