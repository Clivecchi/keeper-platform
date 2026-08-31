"use client"

/**
 * Keeper Stage — the presentation screen.
 * Slides sit above Composer. Objects live in Reach / Chronicle, not on the screen.
 */

import * as React from "react"
import { useBindStageDialog } from "./useBindStageDialog"
import { StagePresentationScreen } from "./StageFilmstrip"
import { useKeeperStageOptional } from "./useKeeperStage"

export function KeeperStageCanvas({ domainId: _domainId }: { domainId: string | null }) {
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
