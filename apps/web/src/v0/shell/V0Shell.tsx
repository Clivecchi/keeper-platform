"use client"

import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import type { StyleId } from "../styles/styles"
import { StyleOverrideProvider } from "../styles/StyleOverrideProvider"
import { CoverFrame } from "../components/cover-frame"
import { MomentFrame } from "../components/moment-frame"
import { KeptMomentsFrame } from "../components/kept-moments-frame"
import { DiagnosticsFrame } from "../frames/diagnostics/DiagnosticsFrame"
import { FeedFrame } from "../frames/feed/FeedFrame"
import { KeepersFrame } from "../frames/keepers/KeepersFrame"
import { JourneysFrame } from "../frames/journeys/JourneysFrame"
import { ProfileFrame } from "../frames/profile/ProfileFrame"
import { AgentFrame } from "../frames/agent/AgentFrame"
import { AdminFrame } from "../frames/admin/AdminFrame"
import { apiFetch } from "../../lib/api"
import { V0ShellProvider, type V0FrameKey } from "./V0ShellContext"

const getDomainFallback = (slug: string) => ({
  id: `fallback-${slug}`,
  name: slug === "default" ? "Welcome to Keeper" : slug.charAt(0).toUpperCase() + slug.slice(1),
  slug,
  description:
    slug === "default" ? "A quiet space for your thoughts and memories" : `Exploring ${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
})

const FRAME_REGISTRY: Record<V0FrameKey, React.ComponentType<any>> = {
  cover: CoverFrame,
  moment: MomentFrame,
  moments: KeptMomentsFrame,
  diagnostics: DiagnosticsFrame,
  feed: FeedFrame,
  keepers: KeepersFrame,
  journeys: JourneysFrame,
  profile: ProfileFrame,
  agent: AgentFrame,
  admin: AdminFrame,
}

export function V0Shell() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const frameParam = (searchParams.get("frame") || "cover").toLowerCase() as V0FrameKey
  const frame = FRAME_REGISTRY[frameParam] ? frameParam : "cover"
  const themeSlug = searchParams.get("theme")
  const styleId = (searchParams.get("style") || "neutral") as StyleId
  const draftId = searchParams.get("draftId")
  const initialStyleId = themeSlug ? undefined : styleId
  const [domainData, setDomainData] = React.useState<any | null>(null)

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
      } catch {
        if (ignore) return
        setDomainData(fallback)
      }
    })()
    return () => {
      ignore = true
    }
  }, [slug])

  if (!slug) {
    return null
  }

  const buildFrameUrl = (nextFrame: V0FrameKey, options?: { draftId?: string | null; themeSlug?: string | null; styleId?: StyleId | null }) => {
    const params = new URLSearchParams()
    params.set("frame", nextFrame)
    const resolvedTheme = options?.themeSlug ?? themeSlug
    const resolvedStyle = options?.styleId ?? styleId
    const resolvedDraft = options?.draftId ?? draftId
    if (resolvedTheme) params.set("theme", resolvedTheme)
    if (resolvedStyle) params.set("style", resolvedStyle)
    if (resolvedDraft) params.set("draftId", resolvedDraft)
    return `/d/${slug}/board?${params.toString()}`
  }

  const closeToBoard = () => {
    const params = new URLSearchParams()
    if (themeSlug) params.set("theme", themeSlug)
    if (styleId) params.set("style", styleId)
    const suffix = params.toString()
    navigate(`/d/${slug}/board${suffix ? `?${suffix}` : ""}`)
  }

  const navigateToFrame = (nextFrame: V0FrameKey, options?: { draftId?: string | null; themeSlug?: string | null; styleId?: StyleId | null }) => {
    navigate(buildFrameUrl(nextFrame, options))
  }

  const FrameComponent = FRAME_REGISTRY[frame]

  return (
    <StyleOverrideProvider initialStyleId={initialStyleId}>
      <V0ShellProvider
        value={{
          domainSlug: slug,
          frame,
          themeSlug,
          styleId,
          draftId,
          buildFrameUrl,
          navigateToFrame,
          closeToBoard,
        }}
      >
        {frame === "cover" ? (
          <FrameComponent styleId={styleId} themeSlug={themeSlug} domainData={domainData} />
        ) : frame === "moment" ? (
          <FrameComponent styleId={styleId} themeSlug={themeSlug} domainSlug={slug} draftId={draftId} />
        ) : frame === "moments" ? (
          <FrameComponent styleId={styleId} themeSlug={themeSlug} domainSlug={slug} />
        ) : frame === "diagnostics" ? (
          <FrameComponent styleId={styleId} themeSlug={themeSlug} domainSlug={slug} returnPath={`/d/${slug}/board`} />
        ) : (
          <FrameComponent styleId={styleId} themeSlug={themeSlug} domainSlug={slug} />
        )}
      </V0ShellProvider>
    </StyleOverrideProvider>
  )
}
