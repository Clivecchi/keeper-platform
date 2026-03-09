"use client"

import * as React from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import type { StyleId } from "../styles/styles"
import { StyleOverrideProvider } from "../styles/StyleOverrideProvider"
import { CoverFrame } from "../components/cover-frame"
import { MomentFrame } from "../components/moment-frame"
import { KeptMomentsFrame } from "../components/kept-moments-frame"
import { CommonsFrame } from "../frames/commons/CommonsFrame"
import { PresentFrame } from "../frames/present/PresentFrame"
import { DiagnosticsFrame } from "../frames/diagnostics/DiagnosticsFrame"
import { FeedFrame } from "../frames/feed/FeedFrame"
import { KeepersFrame } from "../frames/keepers/KeepersFrame"
import { JourneysFrame } from "../frames/journeys/JourneysFrame"
import { ProfileFrame } from "../frames/profile/ProfileFrame"
import { AgentFrame } from "../frames/agent/AgentFrame"
import { AgentBoardFrame } from "../frames/agent/AgentBoardFrame"
import { AdminFrame } from "../frames/admin/AdminFrame"
import { IndexFrame } from "../frames/index/IndexFrame"
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
  cover: CoverFrame,
  commons: CommonsFrame,
  index: IndexFrame,
  moment: MomentFrame,
  moments: KeptMomentsFrame,
  present: PresentFrame,
  diagnostics: DiagnosticsFrame,
  feed: FeedFrame,
  keepers: KeepersFrame,
  journeys: JourneysFrame,
  profile: ProfileFrame,
  agent: AgentBoardFrame,
  kip: AgentFrame,
  admin: AdminFrame,
}

export function V0Shell() {
  const { slug } = useParams<{ slug: string }>()
  const resolvedSlug = slug ?? ""
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isAdmin } = useAuth()
  const { colorScheme } = useTheme()
  const [searchParams] = useSearchParams()
  const defaultFrame = isAuthenticated ? "commons" : "cover"
  const frameParam = (searchParams.get("frame") || defaultFrame).toLowerCase() as V0FrameKey
  const privateFrames = new Set<V0FrameKey>(["commons", "profile", "admin"])
  const requestedFrame = FRAME_REGISTRY[frameParam] ? frameParam : "cover"
  const isPrivateRequest = privateFrames.has(requestedFrame)

  // urlThemeSlug: the ?theme= URL param — developer preview override only.
  // When present it takes full precedence over domain-resolved theme.
  const urlThemeSlug = searchParams.get("theme")

  const styleId = (searchParams.get("style") || "neutral") as StyleId
  const draftId = searchParams.get("draftId")

  // initialStyleId: passed to StyleOverrideProvider.
  // When any theme slug is active (URL or domain), omit the initial style so
  // StyleOverrideProvider starts clean and StyleScope handles token merging.
  const activeThemeSlug = urlThemeSlug ?? DOMAIN_THEME_SLUG
  const initialStyleId = activeThemeSlug ? undefined : styleId

  const [domainData, setDomainData] = React.useState<any | null>(null)
  const [domainFrame, setDomainFrame] = React.useState<DomainFrameJson | null>(null)

  // Resolved once at the Frame level — no child resolves audience independently
  const resolvedAudience = resolveAudience({ isAuthenticated: isAuthenticated ?? false, isAdmin: isAdmin ?? false })
  const commitSha =
    (import.meta as any).env?.VERCEL_GIT_COMMIT_SHA ??
    (import.meta as any).env?.VITE_COMMIT_SHA ??
    "unknown"
  const buildTime = (import.meta as any).env?.VITE_BUILD_TIME ?? "unknown"
  const debugHudFlag = String((import.meta as any).env?.VITE_SHOW_DEBUG_HUD ?? "").toLowerCase()
  const showDebugHud = debugHudFlag === "1" || debugHudFlag === "true"

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
  const buildFrameUrl = React.useCallback((nextFrame: V0FrameKey, options?: { draftId?: string | null; themeSlug?: string | null; styleId?: StyleId | null }) => {
    const params = new URLSearchParams()
    params.set("frame", nextFrame)
    const resolvedTheme = options?.themeSlug ?? urlThemeSlug
    const resolvedStyle = options?.styleId ?? styleId
    const resolvedDraft = options?.draftId ?? draftId
    if (resolvedTheme) params.set("theme", resolvedTheme)
    if (resolvedStyle) params.set("style", resolvedStyle)
    if (resolvedDraft) params.set("draftId", resolvedDraft)
    return `/d/${slug}/board?${params.toString()}`
  }, [draftId, slug, styleId, urlThemeSlug])

  React.useEffect(() => {
    if (!isAuthenticated && isPrivateRequest && slug) {
      navigate(buildFrameUrl("cover"))
    }
  }, [isAuthenticated, isPrivateRequest, slug, navigate, buildFrameUrl])

  const closeToBoard = () => {
    const params = new URLSearchParams()
    if (urlThemeSlug) params.set("theme", urlThemeSlug)
    if (styleId) params.set("style", styleId)
    const suffix = params.toString()
    navigate(`/d/${slug}/board${suffix ? `?${suffix}` : ""}`)
  }

  const navigateToFrame = (nextFrame: V0FrameKey, options?: { draftId?: string | null; themeSlug?: string | null; styleId?: StyleId | null }) => {
    navigate(buildFrameUrl(nextFrame, options))
  }

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
          <FrameComponent styleId={styleId} themeSlug={activeThemeSlug} domainSlug={slug} returnPath={`/d/${slug}/board`} />
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
        </FrameContextProvider>
      </V0ShellProvider>
    </StyleOverrideProvider>
  )
}
