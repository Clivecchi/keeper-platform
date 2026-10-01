/**
 * Cue actions a Frame can ask Keeper to perform.
 * The view reads these so Dialog and Stage share one component.
 */

import * as React from "react"
import type { FramePerformance } from "@keeper/shared"

export type FrameCueHandlers = {
  onOpenPoint?: (input: {
    draftId: string
    pointId: string
    kind?: string
    dialogId?: string | null
  }) => void
  onAcceptDraftPoint?: (draftId: string, pointId: string) => void
  onOpenStagePerformance?: (messageId: string, performance: FramePerformance) => void
  onAddToStory?: (
    messageId: string,
    performance: FramePerformance,
    beat: { title: string; body: string; index: number },
  ) => void
}

const FrameCueContext = React.createContext<FrameCueHandlers>({})

export function FrameCueProvider({
  value,
  children,
}: {
  value: FrameCueHandlers
  children: React.ReactNode
}) {
  return <FrameCueContext.Provider value={value}>{children}</FrameCueContext.Provider>
}

export function useFrameCueHandlers(): FrameCueHandlers {
  return React.useContext(FrameCueContext)
}
