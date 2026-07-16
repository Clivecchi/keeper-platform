"use client"

import * as React from "react"
import { DomainLoadCurtain } from "./DomainLoadCurtain"
import {
  getCachedDomainBySlug,
  isDomainShellWarm,
  prefetchDomainShellForTravel,
} from "../boards/domain/domainShellCache"
import { prefetchDomainBoardDialogSession } from "../boards/domain/dialogSessionPrefetch"
import { waitForDomainCoverDecode } from "../boards/domain/domainShellBootstrap"

export interface SceneChangeContextValue {
  travelToSlug: (slug: string, onNavigate: () => void) => Promise<void>
}

const SceneChangeCtx = React.createContext<SceneChangeContextValue | null>(null)

async function warmDialogForTravel(slug: string): Promise<void> {
  const domain = getCachedDomainBySlug(slug)
  if (!domain) return
  await Promise.all([
    waitForDomainCoverDecode(slug),
    prefetchDomainBoardDialogSession({
      domain,
      domainSlug: slug,
      dialogScope: "keeper",
    }),
  ])
}

export function SceneChangeProvider({ children }: { children: React.ReactNode }) {
  const [curtainSlug, setCurtainSlug] = React.useState<string | null>(null)
  const navigateRef = React.useRef<(() => void) | null>(null)

  const travelToSlug = React.useCallback(
    async (slug: string, onNavigate: () => void) => {
      const normalized = slug.trim()
      if (!normalized) return

      if (isDomainShellWarm(normalized, { requireAudience: true })) {
        await warmDialogForTravel(normalized)
        onNavigate()
        return
      }

      const warm = await prefetchDomainShellForTravel(normalized, {
        requireAudience: true,
      })
      if (warm) {
        await warmDialogForTravel(normalized)
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
    const slug = curtainSlug
    if (slug) {
      void warmDialogForTravel(slug).finally(() => {
        setCurtainSlug(null)
        go?.()
      })
      return
    }
    setCurtainSlug(null)
    go?.()
  }, [curtainSlug])

  const value = React.useMemo(() => ({ travelToSlug }), [travelToSlug])

  return (
    <SceneChangeCtx.Provider value={value}>
      {curtainSlug ? (
        <DomainLoadCurtain domainSlug={curtainSlug} onComplete={handleCurtainComplete} />
      ) : (
        children
      )}
    </SceneChangeCtx.Provider>
  )
}

export function useSceneChangeOptional(): SceneChangeContextValue | null {
  return React.useContext(SceneChangeCtx)
}
