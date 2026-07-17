"use client"

import * as React from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import type { StyleId } from '../styles/styles'
import { DEFAULT_BASE_THEME_SLUG } from '../themes/constants'
import { DEFAULT_DOMAIN_FRAME } from '../data/domain-frame.default'
import { StyleOverrideProvider } from "../styles/StyleOverrideProvider"
import { CORE_FRAME_MAP } from "./frameRegistryMap"
import { resolveBoardDefs } from "../boards/resolveBoardDefs"
import {
  BOARD_DEFINITION_PARAM,
  applyBoardDefinitionSelection,
  applyWorkspaceBoardSwitch,
  clearBoardDefinitionParams,
  migrateLegacyBoardDefParam,
  parseBoardDefinitionId,
  parseWorkspaceBoardId,
  readUrlSearchParams,
  readAuthoritativeSearchParams,
  resolveBoardDefinitionId,
  resolveWorkspaceBoardId,
  isMemberWorkspaceBoard,
  type WorkspaceBoardId,
} from "../boards/workspaceBoardNav"
import {
  HOME_SHELL_BOARD,
  isPlatformDomainSlug,
  isWorkspaceBoardAvailableForDomain,
  LEGACY_PLATFORM_DOMAIN_SLUG,
  normalizePlatformDomainSlug,
  resolveDefaultWorkspaceBoardId,
} from "../boards/domainWorkspaceBoards"
import { resolvePostLoginDomainSlug } from "../boards/domain/domainSwitcherData"
import { buildDomainBoardPath, buildHomePath, DEFAULT_HOME_DISPLAY_NAME, HOME_DOMAIN_PARAM, HOME_PATH, type V0ShellMode } from "./shellMode"
import { buildRealmShellPath } from "../../lib/realmPaths"
import { fetchUserHomeDisplayName } from "../lib/userHomeSettings"
import { UniversalBoard } from "../boards/UniversalBoard"
import { PublicGuestChrome } from "../../mobile/PublicGuestChrome"
import { useMobileSurface } from "../../mobile/hooks/useMobileSurface"
import { useIsMobile } from "../../mobile/hooks/useIsMobile"
import "../../mobile/public-story.css"
import { resolveGuestPublicFrame } from "./guestPublicStory"
import type { UniversalBoardDef } from "../boards/UniversalBoardDefinition"
import { apiFetch } from "../../lib/api"
import { V0ShellProvider, type V0FrameKey } from "./V0ShellContext"
import { SceneChangeProvider } from "../sceneChange/SceneChangeProvider"
import { DomainLoadCurtain } from "../sceneChange/DomainLoadCurtain"
import { DomainShellGate } from "./DomainShellGate"
import { prefetchDomainShell } from "../boards/domain/domainShellCache"

/** Branded home-anchor wait — resolves primary domain when pendingSlug is still empty. */
function HomeAnchorLoadCurtain({ pendingSlug }: { pendingSlug: string | null }) {
  const [slug, setSlug] = React.useState<string | null>(pendingSlug?.trim() || null)

  React.useEffect(() => {
    if (pendingSlug?.trim()) {
      setSlug(pendingSlug.trim())
      prefetchDomainShell(pendingSlug.trim())
      return
    }
    let cancelled = false
    void resolvePostLoginDomainSlug().then((resolved) => {
      if (cancelled || !resolved?.trim()) return
      setSlug(resolved.trim())
      prefetchDomainShell(resolved.trim())
    })
    return () => {
      cancelled = true
    }
  }, [pendingSlug])

  if (slug) return <DomainLoadCurtain domainSlug={slug} />
  return (
    <div className="flex h-screen items-center justify-center bg-neutral-50">
      <p className="text-sm text-neutral-500">Loading Home…</p>
    </div>
  )
}
import { loadDomainFrame, peekDomainFrame } from "../data/loadDomainFrame"
import {
  fetchDomainAudience,
  fetchDomainBySlug,
  getCachedDomainAudience,
  getCachedDomainBySlug,
  peekDomainShellFrame,
} from "../boards/domain/domainShellCache"
import type { DomainFrameJson } from "../data/domain-frame.types"
import {
  ensureDomainProvisioned,
  clearDomainProvisionSessionOk,
  isDomainProvisionSessionOk,
  markDomainProvisionSessionOk,
} from "../lib/ensureDomainProvisioned"
import { domainFrameLooksUnseeded } from "../lib/domainFrameLooksUnseeded"
import { isMissingLeadAgentSlug, readFrameLeadAgentSlug } from "../lib/frameLeadAgentIdentity"
import { resolveDomainAudience, type DomainAudienceRole } from "@keeper/shared"
import { usePlacementMode } from "./usePlacementMode"
import { FrameContextProvider } from "./FrameContext"
import { resolveDomainThemeSync } from "../themes/domainThemeResolver"
import { registerRuntimeTheme } from "../themes/themeResolver"
import { DOMAIN_THEME_SLUG } from "../themes/constants"

/** Placeholder used while domain is loading or when API fails. Never shows hardcoded marketing copy. */
const getDomainFallback = (slug: string) => ({
  id: `fallback-${slug}`,
  name: "",
  slug,
  description: null as string | null,
})

const FRAME_REGISTRY: Record<V0FrameKey, React.ComponentType<any>> = {
  ...CORE_FRAME_MAP,
}

export interface V0ShellProps {
  mode?: V0ShellMode
  /** Required when mode is `brand` — slug from hostname, not URL. */
  brandSlug?: string
}

export function V0Shell({ mode = "domain", brandSlug }: V0ShellProps) {
  const { slug } = useParams<{ slug: string }>()
  const isHomeShell = mode === "home"
  const isBrandShell = mode === "brand"
  const routeSlug = isBrandShell ? "" : (slug ?? "")
  const resolvedSlug = isHomeShell ? "" : (normalizePlatformDomainSlug(routeSlug) ?? routeSlug)
  const [anchorDomainSlug, setAnchorDomainSlug] = React.useState<string | null>(null)
  const [anchorDomainResolved, setAnchorDomainResolved] = React.useState(false)
  const [homeDisplayName, setHomeDisplayName] = React.useState<string>(DEFAULT_HOME_DISPLAY_NAME)
  const effectiveSlug = isHomeShell
    ? (anchorDomainSlug ?? "")
    : isBrandShell
      ? (brandSlug ?? "")
      : resolvedSlug
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isAdmin, authResolved, user } = useAuth()
  const { colorScheme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()

  const routerSearch = location.search
  const windowSearch =
    typeof window !== "undefined" ? window.location.search : routerSearch

  const [pendingWorkspaceBoardId, setPendingWorkspaceBoardId] =
    React.useState<WorkspaceBoardId | null>(null)
  const [pendingBoardDefinitionId, setPendingBoardDefinitionId] =
    React.useState<string | null>(null)

  const urlWorkspaceBoardId = React.useMemo(
    () => resolveWorkspaceBoardId(routerSearch, windowSearch),
    [routerSearch, windowSearch],
  )
  const pendingBoardForDomain =
    pendingWorkspaceBoardId &&
    isWorkspaceBoardAvailableForDomain(pendingWorkspaceBoardId, resolvedSlug)
      ? pendingWorkspaceBoardId
      : null
  const urlOrPendingBoardId = pendingBoardForDomain ?? urlWorkspaceBoardId
  const workspaceBoardId = isHomeShell ? HOME_SHELL_BOARD : urlOrPendingBoardId

  const urlBoardDefinitionId = React.useMemo(
    () =>
      resolveBoardDefinitionId(
        urlWorkspaceBoardId,
        routerSearch,
        windowSearch,
      ),
    [urlWorkspaceBoardId, routerSearch, windowSearch],
  )
  const boardDefinitionId =
    workspaceBoardId === "designer"
      ? (pendingBoardDefinitionId ?? urlBoardDefinitionId)
      : null

  const defaultFrame = isAuthenticated ? "commons" : "cover"
  const frameParam = (searchParams.get("frame") || defaultFrame).toLowerCase() as V0FrameKey
  const mobileSurface = useMobileSurface(isAuthenticated ?? false)
  const isNarrowViewport = useIsMobile()
  const isGuestPublicStory = !isAuthenticated

  // Guests with ?board=* must not enter Universal Board — strip board and land on public story.
  React.useEffect(() => {
    if (!authResolved || isAuthenticated) return

    const board = searchParams.get("board")
    if (!board) return

    const frame = searchParams.get("frame")
    const nextFrame = resolveGuestPublicFrame(frame, "cover")

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("board")
        next.delete("definition")
        next.delete("boardDef")
        if (nextFrame === "cover") {
          next.delete("frame")
        } else {
          next.set("frame", nextFrame)
        }
        return next
      },
      { replace: true },
    )
  }, [authResolved, isAuthenticated, searchParams, setSearchParams])

  // Legacy platform URL `/d/default` → canonical `/d/ke3p` (platform hosts only).
  React.useEffect(() => {
    if (isHomeShell || isBrandShell) return
    if (routeSlug.trim().toLowerCase() !== LEGACY_PLATFORM_DOMAIN_SLUG) return
    const preserved = new URLSearchParams(searchParams)
    navigate(buildRealmShellPath(resolvedSlug, preserved), { replace: true })
  }, [isHomeShell, isBrandShell, routeSlug, resolvedSlug, searchParams, navigate])

  // Legacy ?board=realm on domain URLs → user Home at /home.
  // Domain-scoped Realm now lives at ?board=realm on /d/:slug — redirect removed.

  React.useEffect(() => {
    if (!isAuthenticated || isHomeShell) return

    const board = searchParams.get("board")
    const frame = searchParams.get("frame")
    const surfaceDesktop = searchParams.get("surface") === "desktop"

    // Universal Mobile on domain URLs: default to Domain board; Home lives at /home.
    // Strip legacy ?frame= params — member work lives on ?board=, not standalone frames.
    if (mobileSurface === "mobile" && !surfaceDesktop) {
      if (board && isWorkspaceBoardAvailableForDomain(board, resolvedSlug)) return
      const targetBoard = resolveDefaultWorkspaceBoardId(resolvedSlug)
      if (!isMemberWorkspaceBoard(board) || frame) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set("board", targetBoard)
            next.delete("frame")
            return next
          },
          { replace: true },
        )
      }
      return
    }

    if (!frame && !board) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set("board", resolveDefaultWorkspaceBoardId(resolvedSlug))
          return next
        },
        { replace: true },
      )
    }
  }, [isAuthenticated, isHomeShell, mobileSurface, searchParams, setSearchParams, resolvedSlug])

  React.useEffect(() => {
    if (!isHomeShell || !authResolved || !isAuthenticated) return
    const domainParam = searchParams.get(HOME_DOMAIN_PARAM)?.trim().toLowerCase() || null
    if (domainParam) {
      setAnchorDomainSlug(domainParam)
      setAnchorDomainResolved(true)
      return
    }
    let cancelled = false
    setAnchorDomainResolved(false)
    void resolvePostLoginDomainSlug().then((resolved) => {
      if (!cancelled) {
        setAnchorDomainSlug(resolved)
        setAnchorDomainResolved(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isHomeShell, authResolved, isAuthenticated, searchParams])

  React.useEffect(() => {
    if (!isHomeShell || !authResolved || !isAuthenticated) return
    let cancelled = false
    void fetchUserHomeDisplayName().then((name) => {
      if (!cancelled) setHomeDisplayName(name)
    })
    return () => {
      cancelled = true
    }
  }, [isHomeShell, authResolved, isAuthenticated])

  // Stale ?definition= on non-Design workspaces — use authoritative search.
  React.useEffect(() => {
    const params = readAuthoritativeSearchParams(
      location.search,
      typeof window !== "undefined" ? window.location.search : undefined,
    )
    const workspaceBoard = parseWorkspaceBoardId(params)
    if (!workspaceBoard || workspaceBoard === "designer") return
    const hasDef =
      params.has(BOARD_DEFINITION_PARAM) || params.has("boardDef")
    if (!hasDef) return
    const next = clearBoardDefinitionParams(params)
    navigate(
      {
        pathname: location.pathname,
        search: next.toString() ? `?${next.toString()}` : "",
      },
      { replace: true },
    )
  }, [location.pathname, location.search, navigate])

  // Migrate legacy ?boardDef= → ?definition= on Design workspace.
  React.useEffect(() => {
    const params = readUrlSearchParams(location.search)
    if (parseWorkspaceBoardId(params) !== "designer") return
    const migrated = migrateLegacyBoardDefParam(params)
    if (!migrated) return
    navigate(
      {
        pathname: location.pathname,
        search: migrated.toString() ? `?${migrated.toString()}` : "",
      },
      { replace: true },
    )
  }, [location.pathname, location.search, navigate])

  const privateFrames = new Set<V0FrameKey>(["commons", "profile", "admin"])
  const guestAgentFrames = new Set<V0FrameKey>(["agent", "kip"])
  const requestedFrame = FRAME_REGISTRY[frameParam] ? frameParam : "cover"
  const isPrivateRequest = privateFrames.has(requestedFrame)
  const isGuestAgentRequest = guestAgentFrames.has(requestedFrame)

  // urlThemeSlug: the ?theme= URL param — developer preview override only.
  // When present it takes full precedence over domain-resolved theme.
  const urlThemeSlug = searchParams.get("theme")
  const urlStyleId = searchParams.get("style") as StyleId | null
  const draftId = searchParams.get("draftId")

  const defaultStyleId: StyleId =
    authResolved && isGuestPublicStory ? DEFAULT_BASE_THEME_SLUG : "neutral"
  const styleId = (urlStyleId || defaultStyleId) as StyleId

  // initialStyleId: passed to StyleOverrideProvider.
  // When any theme slug is active (URL or domain), omit the initial style so
  // StyleOverrideProvider starts clean and StyleScope handles token merging.
  // Public guests still seed gray-earth so Warm Dark never flashes on Cover.
  const activeThemeSlug = urlThemeSlug ?? DOMAIN_THEME_SLUG
  const initialStyleId = activeThemeSlug
    ? (authResolved && isGuestPublicStory ? DEFAULT_BASE_THEME_SLUG : undefined)
    : styleId

  const [domainData, setDomainData] = React.useState<any | null>(null)
  const [domainFrame, setDomainFrame] = React.useState<DomainFrameJson | null>(null)

  // Synchronous bootstrap — prefer warm frame cache so DEFAULT never overwrites a real domain theme
  // before StyleScope mounts (curtain already registered; board must keep it).
  if (effectiveSlug) {
    const peekedTheme = peekDomainFrame(effectiveSlug)?.theme
    registerRuntimeTheme(
      DOMAIN_THEME_SLUG,
      resolveDomainThemeSync(
        peekedTheme ?? domainFrame?.theme ?? DEFAULT_DOMAIN_FRAME.theme,
        colorScheme,
      ),
    )
  }

  const [domainAudienceContext, setDomainAudienceContext] = React.useState<{
    domainRole: string | null
    isOwner: boolean
    audience: DomainAudienceRole | null
  } | null>(null)

  // Board defs come from domainFrame.boards (seeded per-domain) with fallback to
  // BOARD_DEFINITIONS_FALLBACK for domains whose frame_json has not yet been seeded.
  const boardDefs: UniversalBoardDef[] = resolveBoardDefs(domainFrame?.boards)
  const effectiveWorkspaceBoardId = isHomeShell
    ? HOME_SHELL_BOARD
    : workspaceBoardId &&
        isWorkspaceBoardAvailableForDomain(workspaceBoardId, resolvedSlug)
      ? workspaceBoardId
      : null
  const matchedDef: UniversalBoardDef | null = effectiveWorkspaceBoardId
    ? boardDefs.find((d) => d.boardId === effectiveWorkspaceBoardId) ?? null
    : null

  // Resolved once at the Frame level — no child resolves audience independently
  const resolvedAudience: DomainAudienceRole =
    domainAudienceContext?.audience ??
    resolveDomainAudience({
      isAuthenticated: isAuthenticated ?? false,
      isAdmin: isAdmin ?? false,
      isOwner: false,
      domainRole: null,
    })
  const commitSha =
    (import.meta as any).env?.VERCEL_GIT_COMMIT_SHA ??
    (import.meta as any).env?.VITE_COMMIT_SHA ??
    "unknown"
  const buildTime = (import.meta as any).env?.VITE_BUILD_TIME ?? "unknown"
  const debugHudFlag = String((import.meta as any).env?.VITE_SHOW_DEBUG_HUD ?? "").toLowerCase()
  const showDebugHud = debugHudFlag === "1" || debugHudFlag === "true"

  const [kipHandoffNotice, setKipHandoffNotice] = React.useState(false)

  React.useEffect(() => {
    if (!isAuthenticated) return undefined
    try {
      if (sessionStorage.getItem("keeper.kip.handoffNotice") === "1") {
        sessionStorage.removeItem("keeper.kip.handoffNotice")
        setKipHandoffNotice(true)
        const t = window.setTimeout(() => setKipHandoffNotice(false), 9000)
        return () => window.clearTimeout(t)
      }
    } catch {
      /* ignore */
    }
    return undefined
  }, [isAuthenticated])

  const kipHandoffToast = kipHandoffNotice ? (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-[100] max-w-sm -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm text-slate-800 shadow-lg"
    >
      Your previous conversation has been saved
      <button
        type="button"
        className="ml-3 text-xs font-medium text-slate-500 underline"
        onClick={() => setKipHandoffNotice(false)}
      >
        Dismiss
      </button>
    </div>
  ) : null

  React.useEffect(() => {
    if (!effectiveSlug) return
    let ignore = false

    const cachedDomain = getCachedDomainBySlug(effectiveSlug)
    if (cachedDomain) {
      setDomainData({ ...cachedDomain, slug: effectiveSlug })
    } else {
      setDomainData({ ...getDomainFallback(effectiveSlug), slug: effectiveSlug })
    }

    void fetchDomainBySlug(effectiveSlug)
      .then((response) => {
        if (!ignore) setDomainData({ ...response, slug: effectiveSlug })
      })
      .catch((err) => {
        if (ignore) return
        if (!getCachedDomainBySlug(effectiveSlug)) {
          setDomainData({ ...getDomainFallback(effectiveSlug), slug: effectiveSlug })
        }
        console.warn("[V0Shell] Domain fetch failed:", err)
      })

    return () => {
      ignore = true
    }
  }, [effectiveSlug])

  React.useEffect(() => {
    if (!effectiveSlug || !authResolved) return
    let ignore = false

    const cachedAudience = getCachedDomainAudience(effectiveSlug)
    if (cachedAudience) {
      setDomainAudienceContext(cachedAudience)
    }

    void fetchDomainAudience(effectiveSlug)
      .then((response) => {
        if (!ignore) setDomainAudienceContext(response)
      })
      .catch((err) => {
        if (ignore) return
        if (!getCachedDomainAudience(effectiveSlug)) {
          setDomainAudienceContext(null)
        }
        console.warn("[V0Shell] Audience fetch failed:", err)
      })

    return () => {
      ignore = true
    }
  }, [effectiveSlug, authResolved, isAuthenticated, user?.id, isAdmin])

  // Debug: expose domainData so Kip Debug can verify what context receives
  React.useEffect(() => {
    ;(window as any).__keeper_domainData = domainData
  }, [domainData])

  // Debug: expose domainFrame for Kip Debug / incognito console verification
  React.useEffect(() => {
    ;(window as any).__keeper_domainFrame = domainFrame
  }, [domainFrame])

  // ── Audience resolution — log and expose on window ──
  React.useEffect(() => {
    console.log("[AudienceResolution] Resolved role:", resolvedAudience)
    ;(window as any).__keeper_resolvedAudience = resolvedAudience
  }, [resolvedAudience])

  // ── Load domain frame JSON ──
  React.useEffect(() => {
    if (!effectiveSlug) return
    let ignore = false

    const cachedFrame = peekDomainShellFrame(effectiveSlug) ?? peekDomainFrame(effectiveSlug)
    if (cachedFrame) {
      setDomainFrame(cachedFrame)
    }

    loadDomainFrame(effectiveSlug)
      .then((frame) => {
        if (ignore) return
        setDomainFrame(frame)
        console.log("[DomainFrame] Loaded for domain:", effectiveSlug, frame)
      })
      .catch((err) => {
        if (ignore) return
        console.warn("[DomainFrame] Failed to load:", err)
      })
    return () => {
      ignore = true
    }
  }, [effectiveSlug])

  // Step 1.2 — auto-repair missing lead agent / frame drift for domain owners.
  React.useEffect(() => {
    if (!authResolved || !isAuthenticated || !user?.id || !effectiveSlug || !domainData?.id) return
    if (String(domainData.id).startsWith("fallback-")) return
    if (domainData.ownerId !== user.id && !isAdmin) return
    if (!domainFrame) return

    const frameLead = readFrameLeadAgentSlug(domainFrame)
    const missingLead = !!(frameLead && isMissingLeadAgentSlug(frameLead))
    const frameLooksUnseeded =
      !!domainFrame &&
      domainFrameLooksUnseeded(domainFrame, effectiveSlug, domainData.name)

    if (missingLead) {
      clearDomainProvisionSessionOk(domainData.id)
    }

    if (
      !missingLead &&
      !frameLooksUnseeded &&
      isDomainProvisionSessionOk(domainData.id)
    ) {
      return
    }

    if (!missingLead && !frameLooksUnseeded && domainFrame) {
      markDomainProvisionSessionOk(domainData.id)
      return
    }

    let cancelled = false
    void (async () => {
      const forceRepair = missingLead
      const result = await ensureDomainProvisioned(domainData.id, { force: forceRepair })
      if (cancelled || !result.provisioned) return
      try {
        const frame = await loadDomainFrame(effectiveSlug, { forceRefresh: true })
        if (!cancelled) {
          setDomainFrame(frame)
          if (!domainFrameLooksUnseeded(frame, effectiveSlug, domainData.name)) {
            markDomainProvisionSessionOk(domainData.id)
          }
          console.log("[DomainProvision] Repaired and reloaded frame for:", effectiveSlug)
        }
      } catch (err) {
        console.warn("[DomainProvision] Frame reload after provision failed:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authResolved, isAuthenticated, user?.id, isAdmin, effectiveSlug, domainData, domainFrame])

  // ── Domain theme resolution ──
  // Runs whenever domainFrame or colorScheme changes.
  // Registers resolved tokens into themeResolver's runtime cache under DOMAIN_THEME_SLUG.
  // StyleScope resolves 'domain-resolved' → finds cached tokens → emits CSS vars.
  // URL ?theme= override bypasses this entirely — static registry handles that path.
  React.useEffect(() => {
    if (!domainFrame) return
    const tokens = resolveDomainThemeSync(domainFrame.theme, colorScheme)
    registerRuntimeTheme(DOMAIN_THEME_SLUG, tokens)
    console.log("[DomainTheme] Resolved and registered:", colorScheme, tokens)
  }, [domainFrame, colorScheme])

  // buildFrameUrl uses urlThemeSlug (not DOMAIN_THEME_SLUG) so that generated URLs
  // only carry ?theme= when the developer has explicitly set an override.
  // Canonical URL form: /d/:slug?frame=... (no /board segment)
  const buildFrameUrl = React.useCallback((nextFrame: V0FrameKey, options?: { draftId?: string | null; themeSlug?: string | null; styleId?: StyleId | null }) => {
    const params = new URLSearchParams()
    params.set("frame", nextFrame)
    const resolvedTheme = options?.themeSlug ?? urlThemeSlug
    const resolvedStyle = options?.styleId ?? styleId
    const resolvedDraft = options?.draftId ?? draftId
    if (resolvedTheme) params.set("theme", resolvedTheme)
    if (resolvedStyle) params.set("style", resolvedStyle)
    if (resolvedDraft) params.set("draftId", resolvedDraft)
    return buildRealmShellPath(effectiveSlug, params)
  }, [draftId, effectiveSlug, styleId, urlThemeSlug])

  React.useEffect(() => {
    // Only redirect after auth has resolved — avoids bouncing authenticated
    // users who have a stored token but whose session API call hasn't returned yet.
    if (authResolved && !isAuthenticated && isPrivateRequest && effectiveSlug) {
      navigate(buildFrameUrl("cover"))
    }
  }, [authResolved, isAuthenticated, isPrivateRequest, effectiveSlug, navigate, buildFrameUrl])

  React.useEffect(() => {
    if (authResolved && !isAuthenticated && isGuestAgentRequest && effectiveSlug) {
      const params = new URLSearchParams(location.search)
      params.set("frame", "cover")
      params.set("companion", "1")
      navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true })
    }
  }, [authResolved, isAuthenticated, isGuestAgentRequest, effectiveSlug, location.pathname, location.search, navigate])


  const closeToBoard = () => {
    if (isHomeShell) {
      navigate(HOME_PATH)
      return
    }
    const params = new URLSearchParams()
    if (urlThemeSlug) params.set("theme", urlThemeSlug)
    if (styleId) params.set("style", styleId)
    const suffix = params.toString()
    navigate(buildRealmShellPath(effectiveSlug, params))
  }

  const navigateToFrame = (nextFrame: V0FrameKey, options?: { draftId?: string | null; themeSlug?: string | null; styleId?: StyleId | null }) => {
    navigate(buildFrameUrl(nextFrame, options))
  }

  const reloadDomainFrame = React.useCallback(async () => {
    if (!effectiveSlug) return
    try {
      const frame = await loadDomainFrame(effectiveSlug, { forceRefresh: true })
      setDomainFrame(frame)
    } catch (err) {
      console.warn("[DomainFrame] Reload failed:", err)
    }
  }, [effectiveSlug])

  const navigateHome = React.useCallback(() => {
    navigate(HOME_PATH)
  }, [navigate])

  const openDomainWorkspace = React.useCallback(
    (boardId: WorkspaceBoardId) => {
      if (!effectiveSlug) return
      navigate(buildDomainBoardPath(effectiveSlug, boardId))
    },
    [effectiveSlug, navigate],
  )

  const commitBoardSearch = React.useCallback(
    (mutate: (params: URLSearchParams) => URLSearchParams) => {
      const winSearch =
        typeof window !== "undefined" ? window.location.search : location.search
      const base = readAuthoritativeSearchParams(location.search, winSearch)
      const next = mutate(new URLSearchParams(base))
      const qs = next.toString()
      navigate(
        { pathname: location.pathname, search: qs ? `?${qs}` : "" },
        { replace: true },
      )
    },
    [location.pathname, location.search, navigate],
  )

  React.useEffect(() => {
    if (!pendingWorkspaceBoardId) return
    if (
      resolvedSlug &&
      !isWorkspaceBoardAvailableForDomain(pendingWorkspaceBoardId, resolvedSlug)
    ) {
      setPendingWorkspaceBoardId(null)
      return
    }
    if (urlWorkspaceBoardId === pendingWorkspaceBoardId) {
      setPendingWorkspaceBoardId(null)
    }
  }, [urlWorkspaceBoardId, pendingWorkspaceBoardId, resolvedSlug])

  React.useEffect(() => {
    setPendingBoardDefinitionId(null)
  }, [effectiveSlug])

  React.useEffect(() => {
    if (pendingBoardDefinitionId === null) return
    if (urlBoardDefinitionId === pendingBoardDefinitionId) {
      setPendingBoardDefinitionId(null)
    }
  }, [urlBoardDefinitionId, pendingBoardDefinitionId])

  React.useEffect(() => {
    if (workspaceBoardId !== "designer") {
      setPendingBoardDefinitionId(null)
    }
  }, [workspaceBoardId])

  React.useEffect(() => {
    const routerBoard = parseWorkspaceBoardId(
      readUrlSearchParams(routerSearch),
    )
    const windowBoard = parseWorkspaceBoardId(
      readUrlSearchParams(windowSearch),
    )
    if (windowBoard && routerBoard && windowBoard !== routerBoard) {
      if ((import.meta as any).env?.DEV) {
        console.warn("[WorkspaceNav] router/window mismatch", {
          windowBoard,
          routerBoard,
          pending: pendingWorkspaceBoardId,
          effective: workspaceBoardId,
        })
      }
    }
    if (workspaceBoardId !== "designer") return
    const routerDef = parseBoardDefinitionId(readUrlSearchParams(routerSearch))
    const windowDef = parseBoardDefinitionId(readUrlSearchParams(windowSearch))
    if (windowDef && routerDef && windowDef !== routerDef) {
      if ((import.meta as any).env?.DEV) {
        console.warn("[BoardDefinitionNav] router/window mismatch", {
          windowDef,
          routerDef,
          pending: pendingBoardDefinitionId,
          effective: boardDefinitionId,
        })
      }
    }
  }, [
    routerSearch,
    windowSearch,
    workspaceBoardId,
    boardDefinitionId,
    pendingWorkspaceBoardId,
    pendingBoardDefinitionId,
  ])

  const switchWorkspace = React.useCallback(
    (boardId: WorkspaceBoardId) => {
      if (isHomeShell) {
        if (boardId === HOME_SHELL_BOARD) return
        openDomainWorkspace(boardId)
        return
      }
      const target = isWorkspaceBoardAvailableForDomain(boardId, resolvedSlug)
        ? boardId
        : resolveDefaultWorkspaceBoardId(resolvedSlug)
      setPendingWorkspaceBoardId(target)
      setPendingBoardDefinitionId(null)
      commitBoardSearch((params) =>
        applyWorkspaceBoardSwitch(params, target),
      )
      console.log(
        "[WorkspaceNav]",
        JSON.stringify({
          action: "switch",
          requested: target,
          windowSearch:
            typeof window !== "undefined" ? window.location.search : null,
          routerSearch: location.search,
        }),
      )
    },
    [commitBoardSearch, isHomeShell, location.search, openDomainWorkspace, resolvedSlug],
  )

  React.useEffect(() => {
    if (isHomeShell || !resolvedSlug || !urlOrPendingBoardId) return
    if (isWorkspaceBoardAvailableForDomain(urlOrPendingBoardId, resolvedSlug)) return
    const fallback = resolveDefaultWorkspaceBoardId(resolvedSlug)
    setPendingWorkspaceBoardId(fallback)
    commitBoardSearch((params) => applyWorkspaceBoardSwitch(params, fallback))
  }, [isHomeShell, resolvedSlug, urlOrPendingBoardId, commitBoardSearch])

  const selectBoardDefinition = React.useCallback(
    (definitionId: string) => {
      if (!isPlatformDomainSlug(resolvedSlug)) return
      setPendingWorkspaceBoardId("designer")
      setPendingBoardDefinitionId(definitionId)
      commitBoardSearch((params) => {
        let next = params
        if (parseWorkspaceBoardId(next) !== "designer") {
          next = applyWorkspaceBoardSwitch(next, "designer")
        }
        return applyBoardDefinitionSelection(next, definitionId)
      })
      console.log(
        "[BoardDefinitionNav]",
        JSON.stringify({
          action: "select",
          requested: definitionId,
          windowSearch:
            typeof window !== "undefined" ? window.location.search : null,
          routerSearch: location.search,
        }),
      )
    },
    [commitBoardSearch, location.search, resolvedSlug],
  )

  const clearBoardDefinition = React.useCallback(() => {
    setPendingBoardDefinitionId(null)
    commitBoardSearch((params) => clearBoardDefinitionParams(params))
  }, [commitBoardSearch])

  // Design workspace: default to Domain board spec when none selected — enables Kip session bootstrap.
  React.useEffect(() => {
    if (!isPlatformDomainSlug(resolvedSlug)) return
    if (workspaceBoardId !== "designer") return
    if (boardDefinitionId) return
    selectBoardDefinition("domain")
  }, [resolvedSlug, workspaceBoardId, boardDefinitionId, selectBoardDefinition])

  const shellWorkspaceNav = React.useMemo(
    () => ({
      workspaceBoardId: isHomeShell ? HOME_SHELL_BOARD : urlOrPendingBoardId,
      boardDefinitionId,
      shellMode: isHomeShell ? ("home" as const) : isBrandShell ? ("brand" as const) : ("domain" as const),
      homeDisplayName,
      anchorDomainSlug: isHomeShell ? anchorDomainSlug : null,
      navigateHome,
      openDomainWorkspace,
      switchWorkspace,
      selectBoardDefinition,
      clearBoardDefinition,
    }),
    [
      isHomeShell,
      isBrandShell,
      urlOrPendingBoardId,
      boardDefinitionId,
      homeDisplayName,
      anchorDomainSlug,
      navigateHome,
      openDomainWorkspace,
      switchWorkspace,
      selectBoardDefinition,
      clearBoardDefinition,
    ],
  )

  const placement = usePlacementMode({
    domainSlug: effectiveSlug,
    pathname: location.pathname,
    isAuthenticated,
    isAdmin,
    requestedFrame,
    buildFrameUrl,
    navigate
  })

  if (!effectiveSlug) {
    if (isHomeShell && authResolved && isAuthenticated) {
      if (!anchorDomainResolved) {
        return <HomeAnchorLoadCurtain pendingSlug={anchorDomainSlug} />
      }
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-2 bg-neutral-50 px-6 text-center">
          <p className="text-sm font-medium text-neutral-700">No domain selected for Home</p>
          <p className="max-w-sm text-xs text-neutral-500">
            Add a domain in Configure, or open Home with{" "}
            <code className="text-[11px]">?domain=your-slug</code>.
          </p>
        </div>
      )
    }
    return null
  }

  const frame = placement.state.frame
  const FrameComponent = FRAME_REGISTRY[frame]

  const shouldRenderWorkspaceBoard =
    matchedDef &&
    (isAuthenticated || !matchedDef.access.isPrivate)

  // ── Board rendering — takes precedence over frame routing ─────────────────
  if (shouldRenderWorkspaceBoard && matchedDef) {
    // isAdminOnly guard — render inline, no redirect
    if (matchedDef.access.isAdminOnly && !isAdmin) {
      return (
        <StyleOverrideProvider initialStyleId={initialStyleId}>
          <div className="flex h-screen items-center justify-center bg-neutral-50">
            <div className="rounded-xl border border-neutral-200 bg-white px-8 py-6 text-center shadow-sm">
              <p className="text-sm font-medium text-neutral-700">Access restricted</p>
              <p className="mt-1 text-xs text-neutral-400">
                {matchedDef.displayName} is available to Platform Admins only.
              </p>
            </div>
          </div>
        </StyleOverrideProvider>
      )
    }

    // Authorised — UniversalBoard owns its layout and chrome; V0Shell mounts it with context and steps back
    const resolvedDomainId =
      domainData?.id && !String(domainData.id).startsWith("fallback-")
        ? String(domainData.id)
        : null
    return (
      <StyleOverrideProvider initialStyleId={initialStyleId}>
        <V0ShellProvider
          value={{
            domainSlug: effectiveSlug,
            frame,
            placementMode: placement.state.mode,
            placementActions: placement.actions,
            themeSlug: urlThemeSlug,
            styleId,
            draftId,
            domainData,
            domainFrame,
            resolvedAudience,
            buildFrameUrl,
            navigateToFrame,
            closeToBoard,
            reloadDomainFrame,
            ...shellWorkspaceNav,
          }}
        >
          <SceneChangeProvider>
          <DomainShellGate
            domainSlug={effectiveSlug}
            requireAudience={authResolved && isAuthenticated}
          >
          <FrameContextProvider
            domainSlug={effectiveSlug}
            frame={frame}
            placementMode={placement.state.mode}
            themeSlug={activeThemeSlug}
            draftId={draftId}
          >
            <UniversalBoard def={matchedDef} />
            {kipHandoffToast}
          </FrameContextProvider>
          </DomainShellGate>
          </SceneChangeProvider>
        </V0ShellProvider>
      </StyleOverrideProvider>
    )
  }

  return (
    <StyleOverrideProvider initialStyleId={initialStyleId}>
      <V0ShellProvider
        value={{
          domainSlug: effectiveSlug,
          frame,
          placementMode: placement.state.mode,
          placementActions: placement.actions,
          // V0ShellContext carries the URL theme for ThemeSwitcher / navigation compatibility.
          // Frame components receive activeThemeSlug directly as a prop (see below).
          themeSlug: urlThemeSlug,
          styleId,
          draftId,
          domainData,
          domainFrame,
          resolvedAudience,
          buildFrameUrl,
          navigateToFrame,
          closeToBoard,
          reloadDomainFrame,
          ...shellWorkspaceNav,
        }}
      >
        <FrameContextProvider
          domainSlug={effectiveSlug}
          frame={frame}
          placementMode={placement.state.mode}
          themeSlug={activeThemeSlug}
          draftId={draftId}
        >
        <div
          className={
            isGuestPublicStory
              ? `public-story-shell presentation-mode${isNarrowViewport ? " public-story-shell--narrow" : ""}`
              : undefined
          }
        >
          {isGuestPublicStory ? <PublicGuestChrome domainSlug={effectiveSlug} /> : null}
          {frame === "cover" ? (
            <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainData={domainData} />
          ) : frame === "moment" ? (
            <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainSlug={effectiveSlug} draftId={draftId} />
          ) : frame === "moments" ? (
            <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainSlug={effectiveSlug} />
          ) : frame === "present" ? (
            <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} />
          ) : frame === "diagnostics" ? (
            <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainSlug={effectiveSlug} returnPath={buildRealmShellPath(effectiveSlug)} />
          ) : (
            <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainSlug={effectiveSlug} />
          )}
        </div>
        {showDebugHud && (
          <div
            className="fixed right-3 z-50 rounded-md border border-black/10 bg-white/80 px-2 py-1 text-[10px] font-mono text-gray-700 shadow-sm backdrop-blur"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
          >
            {commitSha} | {buildTime}
          </div>
        )}
        {kipHandoffToast}
        </FrameContextProvider>
      </V0ShellProvider>
    </StyleOverrideProvider>
  )
}
