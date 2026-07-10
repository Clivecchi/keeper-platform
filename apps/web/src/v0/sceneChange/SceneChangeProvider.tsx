"use client"

import * as React from "react"
import { SceneChangeCurtain } from "./SceneChangeCurtain"
import {
  isDomainShellWarm,
  prefetchDomainShellForTravel,
} from "../boards/domain/domainShellCache"

export interface SceneChangeContextValue {
  travelToSlug: (slug: string, onNavigate: () => void) => Promise<void>
}

const SceneChangeCtx = React.createContext<SceneChangeContextValue | null>(null)

export function SceneChangeProvider({ children }: { children: React.ReactNode }) {
  const [curtainSlug, setCurtainSlug] = React.useState<string | null>(null)
  const navigateRef = React.useRef<(() => void) | null>(null)

  const travelToSlug = React.useCallback(
    async (slug: string, onNavigate: () => void) => {
      const normalized = slug.trim()
      if (!normalized) return

      if (isDomainShellWarm(normalized, { requireAudience: true })) {
        onNavigate()
        return
      }

      const warm = await prefetchDomainShellForTravel(normalized, {
        requireAudience: true,
      })
      if (warm) {
        onNavigate()
        return
      }

      navigateRef.current = onNavigate
      setCurtainSlug(normalized)
    },
    [],
  )

  const handleCurtainComplete = React.useCallback(() => {
    const go = navigateRef.current
    navigateRef.current = null
    setCurtainSlug(null)
    go?.()
  }, [])

  const value = React.useMemo(() => ({ travelToSlug }), [travelToSlug])

  return (
    <SceneChangeCtx.Provider value={value}>
      {children}
      {curtainSlug ? (
        <SceneChangeCurtain domainSlug={curtainSlug} onComplete={handleCurtainComplete} />
      ) : null}
    </SceneChangeCtx.Provider>
  )
}

export function useSceneChangeOptional(): SceneChangeContextValue | null {
  return React.useContext(SceneChangeCtx)
}
