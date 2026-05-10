"use client"

import * as React from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import type { StyleId } from "../styles/styles"
import { StyleOverrideProvider } from "../styles/StyleOverrideProvider"
import { CORE_FRAME_MAP } from "./frameRegistryMap"
import { BOARD_DEFINITIONS_FALLBACK } from "../boards/useBoardDefs"
import { UniversalBoard } from "../boards/UniversalBoard"
import type { UniversalBoardDef } from "../boards/UniversalBoardDefinition"
import { apiFetch } from "../../lib/api"
import { V0ShellProvider, type V0FrameKey } from "./V0ShellContext"
import { loadDomainFrame } from "../data/loadDomainFrame"
import type { DomainFrameJson } from "../data/domain-frame.types"
import { resolveAudience } from "../data/resolveAudience"
import { useExperienceMode } from "./useExperienceMode"
import { FrameContextProvider } from "./FrameContext"
import { resolveDomainThemeSync } from "../themes/domainThemeResolver"
import { registerRuntimeTheme } from "../themes/themeResolver"

/** The slug used when domain JSON is the active theme source. */
const DOMAIN_THEME_SLUG = 'domain-resolved'

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

export function V0Shell() {
  const { slug } = useParams<{ slug: string }>()
  const resolvedSlug = slug ?? ""
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isAdmin, authResolved } = useAuth()
  const { colorScheme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const defaultFrame = isAuthenticated ? "commons" : "cover"
  const frameParam = (searchParams.get("frame") || defaultFrame).toLowerCase() as V0FrameKey

  React.useEffect(() => {
    if (
      isAuthenticated &&
      !searchParams.get("frame") &&
      !searchParams.get("board")
    ) {
      setSearchParams({ board: "domain" }, { replace: true })
    }
  }, [isAuthenticated, searchParams, setSearchParams])
  const privateFrames = new Set<V0FrameKey>(["commons", "profile", "admin"])
  const requestedFrame = FRAME_REGISTRY[frameParam] ? frameParam : "cover"
  const isPrivateRequest = privateFrames.has(requestedFrame)

  // urlThemeSlug: the ?theme= URL param — developer preview override only.
  // When present it takes full precedence over domain-resolved theme.
  const urlThemeSlug = searchParams.get("theme")

  const styleId = (searchParams.get("style") || "neutral") as StyleId
  const draftId = searchParams.get("draftId")

  // ?board= parameter — takes precedence over ?frame= when present and recognised.
  const boardParam = (searchParams.get("board") || "").toLowerCase()

  // initialStyleId: passed to StyleOverrideProvider.
  // When any theme slug is active (URL or domain), omit the initial style so
  // StyleOverrideProvider starts clean and StyleScope handles token merging.
  const activeThemeSlug = urlThemeSlug ?? DOMAIN_THEME_SLUG
  const initialStyleId = activeThemeSlug ? undefined : styleId

  const [domainData, setDomainData] = React.useState<any | null>(null)
  const [domainFrame, setDomainFrame] = React.useState<DomainFrameJson | null>(null)

  // Board defs come from domainFrame.boards (seeded per-domain) with fallback to
  // BOARD_DEFINITIONS_FALLBACK for domains whose frame_json has not yet been seeded.
  const boardDefs: UniversalBoardDef[] =
    (domainFrame?.boards && domainFrame.boards.length > 0)
      ? domainFrame.boards
      : Object.values(BOARD_DEFINITIONS_FALLBACK)
  const matchedDef: UniversalBoardDef | null =
    boardParam ? boardDefs.find((d) => d.boardId === boardParam) ?? null : null

  // Resolved once at the Frame level — no child resolves audience independently
  const resolvedAudience = resolveAudience({ isAuthenticated: isAuthenticated ?? false, isAdmin: isAdmin ?? false })
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
    if (!slug) return
    const fallback = getDomainFallback(slug)
    setDomainData(fallback)
    let ignore = false
    ;(async () => {
      try {
        const response = await apiFetch(`/api/domains/by-slug/${slug}`)
        if (ignore) return
        if (response?.id) {
          setDomainData(response)
        }
      } catch (err) {
        if (ignore) return
        setDomainData(fallback)
        console.warn("[V0Shell] Domain fetch failed:", err)
      }
    })()
    return () => {
      ignore = true
    }
  }, [slug])

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
    if (!slug) return
    let ignore = false
    loadDomainFrame(slug).then((frame) => {
      if (ignore) return
      setDomainFrame(frame)
      console.log("[DomainFrame] Loaded for domain:", slug, frame)
    }).catch((err) => {
      if (ignore) return
      console.warn("[DomainFrame] Failed to load:", err)
    })
    return () => { ignore = true }
  }, [slug])

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

  if (!slug) {
    return null
  }

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
    return `/d/${slug}?${params.toString()}`
  }, [draftId, slug, styleId, urlThemeSlug])

  React.useEffect(() => {
    // Only redirect after auth has resolved — avoids bouncing authenticated
    // users who have a stored token but whose session API call hasn't returned yet.
    if (authResolved && !isAuthenticated && isPrivateRequest && slug) {
      navigate(buildFrameUrl("cover"))
    }
  }, [authResolved, isAuthenticated, isPrivateRequest, slug, navigate, buildFrameUrl])

  React.useEffect(() => {
    // Same authResolved guard — prevents premature redirect on page refresh.
    if (authResolved && matchedDef?.access.isPrivate && !isAuthenticated && slug) {
      navigate(buildFrameUrl("cover"))
    }
  }, [authResolved, matchedDef, isAuthenticated, slug, navigate, buildFrameUrl])

  const closeToBoard = () => {
    const params = new URLSearchParams()
    if (urlThemeSlug) params.set("theme", urlThemeSlug)
    if (styleId) params.set("style", styleId)
    const suffix = params.toString()
    navigate(`/d/${slug}${suffix ? `?${suffix}` : ""}`)
  }

  const navigateToFrame = (nextFrame: V0FrameKey, options?: { draftId?: string | null; themeSlug?: string | null; styleId?: StyleId | null }) => {
    navigate(buildFrameUrl(nextFrame, options))
  }

  const reloadDomainFrame = React.useCallback(async () => {
    if (!slug) return
    try {
      const frame = await loadDomainFrame(slug)
      setDomainFrame(frame)
    } catch (err) {
      console.warn("[DomainFrame] Reload failed:", err)
    }
  }, [slug])

  const experience = useExperienceMode({
    domainSlug: resolvedSlug,
    pathname: location.pathname,
    isAuthenticated,
    isAdmin,
    requestedFrame,
    buildFrameUrl,
    navigate
  })
  const frame = experience.state.frame
  const FrameComponent = FRAME_REGISTRY[frame]

  // ── Board rendering — takes precedence over frame routing ─────────────────
  if (matchedDef) {
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

    // isPrivate + unauthenticated — redirect handled by useEffect above; render nothing while redirecting
    if (matchedDef.access.isPrivate && !isAuthenticated) {
      return null
    }

    // Authorised — UniversalBoard owns its layout and chrome; V0Shell mounts it with context and steps back
    return (
      <StyleOverrideProvider initialStyleId={initialStyleId}>
        <V0ShellProvider
          value={{
            domainSlug: slug,
            frame,
            experienceMode: experience.state.mode,
            experienceActions: experience.actions,
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
          }}
        >
          <FrameContextProvider
            domainSlug={slug}
            frame={frame}
            experienceMode={experience.state.mode}
            themeSlug={activeThemeSlug}
            draftId={draftId}
          >
            <UniversalBoard def={matchedDef} />
            {kipHandoffToast}
          </FrameContextProvider>
        </V0ShellProvider>
      </StyleOverrideProvider>
    )
  }

  return (
    <StyleOverrideProvider initialStyleId={initialStyleId}>
      <V0ShellProvider
        value={{
          domainSlug: slug,
          frame,
          experienceMode: experience.state.mode,
          experienceActions: experience.actions,
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
        }}
      >
        <FrameContextProvider
          domainSlug={slug}
          frame={frame}
          experienceMode={experience.state.mode}
          themeSlug={activeThemeSlug}
          draftId={draftId}
        >
        {frame === "cover" ? (
          <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainData={domainData} />
        ) : frame === "moment" ? (
          <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainSlug={slug} draftId={draftId} />
        ) : frame === "moments" ? (
          <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainSlug={slug} />
        ) : frame === "diagnostics" ? (
          <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainSlug={slug} returnPath={`/d/${slug}`} />
        ) : (
          <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainSlug={slug} />
        )}
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
