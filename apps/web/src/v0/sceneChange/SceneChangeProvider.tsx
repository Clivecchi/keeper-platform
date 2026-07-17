"use client"

import * as React from "react"
import { DomainLoadCurtain } from "./DomainLoadCurtain"
import {
  getCachedDomainBySlug,
  isDomainShellWarm,
  prefetchDomainShellForTravel,
} from "../boards/domain/domainShellCache"
import { markTravelCurtainShown } from "../boards/domain/domainShellBootstrap"
import {
  holdCurtainMinimum,
  prepareDomainBoardReveal,
} from "../boards/domain/prepareDomainBoardReveal"
import { peekPrefetchedDialogSession } from "../boards/domain/dialogSessionPrefetch"

export interface SceneChangeContextValue {
  travelToSlug: (slug: string, onNavigate: () => void) => Promise<void>
}

const SceneChangeCtx = React.createContext<SceneChangeContextValue | null>(null)

function isTravelBoardReady(slug: string): boolean {
  if (!isDomainShellWarm(slug, { requireAudience: true })) return false
  const domain = getCachedDomainBySlug(slug)
  if (!domain?.id) return false
  return !!peekPrefetchedDialogSession(domain.id, "domain")
}

export function SceneChangeProvider({ children }: { children: React.ReactNode }) {
  const [curtainSlug, setCurtainSlug] = React.useState<string | null>(null)
  const navigateRef = React.useRef<(() => void) | null>(null)

  const travelToSlug = React.useCallback(
    async (slug: string, onNavigate: () => void) => {
      const normalized = slug.trim()
      if (!normalized) return

      // Already fully warm — still brand briefly with curtain if not board-ready.
      if (isTravelBoardReady(normalized)) {
        markTravelCurtainShown(normalized)
        onNavigate()
        return
      }

      navigateRef.current = onNavigate
      setCurtainSlug(normalized)

      const startedAt = Date.now()
      await prefetchDomainShellForTravel(normalized, { requireAudience: true })
      const prepared = await prepareDomainBoardReveal(normalized, {
        requireAudience: true,
        board: "domain",
      })
      await holdCurtainMinimum(Date.now() - startedAt)

      markTravelCurtainShown(normalized)
      const go = navigateRef.current
      navigateRef.current = null
      setCurtainSlug(null)

      if (prepared.ready || isTravelBoardReady(normalized)) {
        go?.()
        return
      }

      // Fail soft — navigate anyway so the user is not stuck; boot gate can retry.
      go?.()
    },
    [],
  )

  const value = React.useMemo(() => ({ travelToSlug }), [travelToSlug])

  return (
    <SceneChangeCtx.Provider value={value}>
      {curtainSlug ? <DomainLoadCurtain domainSlug={curtainSlug} /> : children}
    </SceneChangeCtx.Provider>
  )
}

export function useSceneChangeOptional(): SceneChangeContextValue | null {
  return React.useContext(SceneChangeCtx)
}
