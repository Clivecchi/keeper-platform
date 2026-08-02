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
  BOARD_REVEAL_HARD_TIMEOUT_MS,
  holdCurtainMinimum,
  prepareDomainBoardReveal,
} from "../boards/domain/prepareDomainBoardReveal"
import { isBoardNavWarm } from "../boards/boardNavDataCache"
import { resolveRevealNavSections } from "../boards/domain/resolveRevealNavSections"

export interface SceneChangeContextValue {
  travelToSlug: (slug: string, onNavigate: () => void) => Promise<void>
}

const SceneChangeCtx = React.createContext<SceneChangeContextValue | null>(null)

/** Shell + Nav warm. Dialog session optional — created on first send. */
function isTravelBoardReady(slug: string): boolean {
  if (!isDomainShellWarm(slug, { requireAudience: true })) return false
  const domain = getCachedDomainBySlug(slug)
  if (!domain?.id) return false
  return isBoardNavWarm(domain.id, resolveRevealNavSections(slug, "domain"))
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
      // Race a hard ceiling — a hung portrait/network must not trap domain travel forever.
      const preparePromise = prepareDomainBoardReveal(normalized, {
        requireAudience: true,
        board: "domain",
      })
      const prepared = await Promise.race([
        preparePromise,
        new Promise<Awaited<typeof preparePromise>>((resolve) => {
          window.setTimeout(
            () =>
              resolve({
                ready: false,
                sessionId: null,
                elapsedMs: BOARD_REVEAL_HARD_TIMEOUT_MS,
                navWarm: false,
              }),
            BOARD_REVEAL_HARD_TIMEOUT_MS,
          )
        }),
      ])
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
