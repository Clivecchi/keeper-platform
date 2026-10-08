"use client"

import * as React from "react"
import type { CastCueSelectionMode, CastMemberChip } from "../components/CastCueBar"

/** Cast the center registers while the performance posture is on. The right curtain reads it. */
export type StageCurtainCast = {
  instruments: ReadonlyArray<CastMemberChip>
  activeSlug: string | null
  activeSlugs: ReadonlyArray<string>
  selectionMode: CastCueSelectionMode
  leadLocked: boolean
  collaborationMode?: boolean
  onInvoke?: (slug: string) => void
}

type StageCurtainApi = {
  cast: StageCurtainCast | null
  setCast: (cast: StageCurtainCast | null) => void
}

const StageCurtainCtx = React.createContext<StageCurtainApi | null>(null)

export function StageCurtainProvider({ children }: { children: React.ReactNode }) {
  const [cast, setCastState] = React.useState<StageCurtainCast | null>(null)
  const setCast = React.useCallback((next: StageCurtainCast | null) => {
    setCastState(next)
  }, [])
  const value = React.useMemo(() => ({ cast, setCast }), [cast, setCast])
  return <StageCurtainCtx.Provider value={value}>{children}</StageCurtainCtx.Provider>
}

export function useStageCurtainOptional(): StageCurtainApi | null {
  return React.useContext(StageCurtainCtx)
}
