"use client"

import * as React from "react"
import { useAuth } from "../../context/AuthContext"
import { apiFetch } from "../../lib/api"
import type { V0FrameKey } from "./V0ShellContext"
import type { PlacementMode } from "./usePlacementMode"
import { useV0ShellOptional } from "./V0ShellContext"

// =============================================================================
// Types — the Context Contract
// =============================================================================

export interface FrameContextDomain {
  id: string
  slug: string
  name: string
  description: string | null
}

export interface FrameContextSelection {
  activeKeeperId: string | null
  activeJourneyId: string | null
}

export interface FrameContextTheme {
  /** V0 style slug (e.g. 'diary-paper', 'neutral') */
  themeSlug: string | null
  /** UUID theme id (reserved for future; null for MVP) */
  themeId: string | null
}

export interface FrameContextAuth {
  userId: string | null
  isAuthenticated: boolean
  isAdmin: boolean
}

export interface FrameContextValue {
  auth: FrameContextAuth
  domain: FrameContextDomain | null
  selection: FrameContextSelection
  theme: FrameContextTheme
  frame: {
    frameId: V0FrameKey
    placementMode: PlacementMode
    draftId: string | null
  }
  /** Whether domain/keeper/journey are still loading */
  isResolving: boolean
  /** Update active keeper */
  setActiveKeeperId: (id: string | null) => void
  /** Update active journey */
  setActiveJourneyId: (id: string | null) => void
}

// =============================================================================
// Context
// =============================================================================

const FrameCtx = React.createContext<FrameContextValue | null>(null)

// =============================================================================
// Persistence helpers (localStorage, domain-scoped)
// =============================================================================

const SK_KEEPER = "keeper_v0_active_keeper"
const SK_JOURNEY = "keeper_v0_active_journey"

function getPersistedSelection(domainSlug: string) {
  try {
    return {
      keeperId: localStorage.getItem(`${SK_KEEPER}:${domainSlug}`),
      journeyId: localStorage.getItem(`${SK_JOURNEY}:${domainSlug}`),
    }
  } catch {
    return { keeperId: null, journeyId: null }
  }
}

function persistSelection(
  domainSlug: string,
  keeperId: string | null,
  journeyId: string | null,
) {
  try {
    if (keeperId) localStorage.setItem(`${SK_KEEPER}:${domainSlug}`, keeperId)
    else localStorage.removeItem(`${SK_KEEPER}:${domainSlug}`)
    if (journeyId) localStorage.setItem(`${SK_JOURNEY}:${domainSlug}`, journeyId)
    else localStorage.removeItem(`${SK_JOURNEY}:${domainSlug}`)
  } catch {
    /* localStorage unavailable */
  }
}

// =============================================================================
// Provider
// =============================================================================

interface FrameContextProviderProps {
  domainSlug: string
  frame: V0FrameKey
  placementMode: PlacementMode
  themeSlug: string | null
  draftId: string | null
  children: React.ReactNode
}

export function FrameContextProvider({
  domainSlug,
  frame,
  placementMode,
  themeSlug,
  draftId,
  children,
}: FrameContextProviderProps) {
  const { user, isAuthenticated, isAdmin } = useAuth()
  const v0Shell = useV0ShellOptional()

  // --- Domain state ---
  const [domain, setDomain] = React.useState<FrameContextDomain | null>(null)
  const [isResolving, setIsResolving] = React.useState(true)

  // --- Selection state ---
  const [activeKeeperId, setActiveKeeperId] = React.useState<string | null>(null)
  const [activeJourneyId, setActiveJourneyId] = React.useState<string | null>(null)

  // =========================================================================
  // 1. Domain resolution
  //    Single source: V0Shell domainData when available (avoids duplicate fetch).
  //    Only fetch when outside V0Shell (e.g. standalone FrameContext).
  // =========================================================================
  const shellDomainData = v0Shell?.domainData as { id?: string; slug?: string; name?: string; description?: string | null } | null | undefined

  React.useEffect(() => {
    if (!domainSlug) {
      setDomain(null)
      setIsResolving(false)
      return
    }

    const fallback: FrameContextDomain = {
      id: `fallback-${domainSlug}`,
      slug: domainSlug,
      name: "",
      description: null,
    }

    // When inside V0Shell: always derive from shell domainData — single fetch, no duplicate /api/domains/by-slug
    if (v0Shell) {
      if (shellDomainData?.id && !String(shellDomainData.id).startsWith("fallback-")) {
        setDomain({
          id: shellDomainData.id,
          slug: shellDomainData.slug ?? domainSlug,
          name: shellDomainData.name ?? domainSlug,
          description: shellDomainData.description ?? null,
        })
        setIsResolving(false)
      } else {
        setDomain(fallback)
        setIsResolving(true)
      }
      return
    }

    // Outside V0Shell: fetch ourselves
    setDomain(fallback)
    setIsResolving(true)
    let ignore = false
    ;(async () => {
      try {
        const res = await apiFetch(`/api/domains/by-slug/${domainSlug}`)
        if (ignore) return
        if (res?.id) {
          setDomain({
            id: res.id,
            slug: res.slug ?? domainSlug,
            name: res.name ?? domainSlug,
            description: res.description ?? null,
          })
        }
      } catch {
        // keep fallback
      }
      if (!ignore) setIsResolving(false)
    })()

    return () => {
      ignore = true
    }
  }, [domainSlug, v0Shell, shellDomainData?.id, shellDomainData?.slug, shellDomainData?.name, shellDomainData?.description])

  // =========================================================================
  // 2. Keeper + Journey resolution (after domain resolves)
  //    Order: persisted → first from API list → null
  // =========================================================================
  React.useEffect(() => {
    if (!domain?.id || domain.id.startsWith("fallback-")) return
    if (!isAuthenticated) return

    let ignore = false
    ;(async () => {
      try {
        const persisted = getPersistedSelection(domainSlug)

        const [keepersRes, journeysRes] = await Promise.all([
          apiFetch(`/api/keepers?domainId=${domain.id}`).catch(() => null),
          apiFetch(`/api/journeys?domainId=${domain.id}`).catch(() => null),
        ])
        if (ignore) return

        const keepers: { id: string }[] =
          (keepersRes as any)?.data?.keepers ??
          (keepersRes as any)?.keepers ??
          (Array.isArray(keepersRes) ? keepersRes : [])
        const journeys: { id: string }[] =
          (journeysRes as any)?.data?.journeys ??
          (journeysRes as any)?.journeys ??
          (Array.isArray(journeysRes) ? journeysRes : [])

        // Resolve keeper: persisted → first available
        let resolvedKeeper = persisted.keeperId
        if (resolvedKeeper && !keepers.some((k) => k.id === resolvedKeeper)) {
          resolvedKeeper = null
        }
        if (!resolvedKeeper && keepers.length > 0) {
          resolvedKeeper = keepers[0].id
        }

        // Resolve journey: persisted → first available
        let resolvedJourney = persisted.journeyId
        if (resolvedJourney && !journeys.some((j) => j.id === resolvedJourney)) {
          resolvedJourney = null
        }
        if (!resolvedJourney && journeys.length > 0) {
          resolvedJourney = journeys[0].id
        }

        if (!ignore) {
          setActiveKeeperId(resolvedKeeper)
          setActiveJourneyId(resolvedJourney)
          persistSelection(domainSlug, resolvedKeeper, resolvedJourney)
        }
      } catch (error) {
        console.error("[FrameContext] Failed to resolve keeper/journey:", error)
      }
    })()

    return () => {
      ignore = true
    }
  }, [domain?.id, domainSlug, isAuthenticated])

  // =========================================================================
  // Selection setters (persist on change)
  // =========================================================================
  const handleSetActiveKeeperId = React.useCallback(
    (id: string | null) => {
      setActiveKeeperId(id)
      persistSelection(domainSlug, id, activeJourneyId)
    },
    [domainSlug, activeJourneyId],
  )

  const handleSetActiveJourneyId = React.useCallback(
    (id: string | null) => {
      setActiveJourneyId(id)
      persistSelection(domainSlug, activeKeeperId, id)
    },
    [domainSlug, activeKeeperId],
  )

  // =========================================================================
  // 3. Theme resolution
  //    Runtime tokens: domain-resolved slug (V0Shell + useBoardThemeRegistration).
  //    Hierarchy override: Moment → Path → Journey → Keeper (board hook).
  //    URL ?theme= bypasses domain-resolved for dev preview.
  // =========================================================================
  const resolvedTheme: FrameContextTheme = React.useMemo(
    () => ({ themeSlug: themeSlug ?? null, themeId: null }),
    [themeSlug],
  )

  // =========================================================================
  // Assembled context value
  // =========================================================================
  const value = React.useMemo<FrameContextValue>(
    () => ({
      auth: {
        userId: user?.id ?? null,
        isAuthenticated,
        isAdmin,
      },
      domain,
      selection: {
        activeKeeperId,
        activeJourneyId,
      },
      theme: resolvedTheme,
      frame: {
        frameId: frame,
        placementMode,
        draftId,
      },
      isResolving,
      setActiveKeeperId: handleSetActiveKeeperId,
      setActiveJourneyId: handleSetActiveJourneyId,
    }),
    [
      user?.id,
      isAuthenticated,
      isAdmin,
      domain,
      activeKeeperId,
      activeJourneyId,
      resolvedTheme,
      frame,
      placementMode,
      draftId,
      isResolving,
      handleSetActiveKeeperId,
      handleSetActiveJourneyId,
    ],
  )

  return <FrameCtx.Provider value={value}>{children}</FrameCtx.Provider>
}

// =============================================================================
// Hooks
// =============================================================================

/** Strict hook — throws if used outside FrameContextProvider */
export function useFrameContext(): FrameContextValue {
  const ctx = React.useContext(FrameCtx)
  if (!ctx) {
    throw new Error("useFrameContext must be used within FrameContextProvider")
  }
  return ctx
}

/** Optional hook — returns null when outside provider (for shared components) */
export function useFrameContextOptional(): FrameContextValue | null {
  return React.useContext(FrameCtx)
}
