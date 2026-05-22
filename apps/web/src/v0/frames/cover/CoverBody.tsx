"use client"

import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { CoverLens, type CoverLensItem } from "../../components/cover-lens"
import { createDraftMoment } from "../../api/v0Moments"
import { useV0ShellOptional, type V0FrameKey } from "../../shell/V0ShellContext"
import { JourneyInvitationSlide } from "../../slides/JourneyInvitationSlide"
import { useAuth } from "../../../context/AuthContext"
import { getApiBase } from "../../../lib/apiFetch"
import { CoverChatInterface, mergeCoverChatInterface } from "./CoverChatInterface"

function isDesignerBoardPreviewShell(
  shell: ReturnType<typeof useV0ShellOptional>,
): boolean {
  if (!shell?.buildFrameUrl) return false
  return shell.buildFrameUrl("cover" as V0FrameKey) === "#"
}

interface CoverBodyProps {
  /** Domain data for navigation */
  domainData?: {
    id?: string
    name: string
    slug: string
    description?: string
  }
  /** Theme slug for navigation */
  themeSlug?: string | null
  /** Navigation callback */
  onNavigate?: (path: string) => void
  /** Cover surface state */
  coverState?: "open" | "closed"
}

export function CoverBody({ domainData, themeSlug, onNavigate, coverState = "closed" }: CoverBodyProps) {
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)
  const [forwardLoading, setForwardLoading] = useState(false)
  const v0Shell = useV0ShellOptional()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const navigateTo = (path: string) => {
    onNavigate?.(path)
  }

  const handleOpenIndex = () => {
    if (v0Shell) {
      v0Shell.navigateToFrame("index")
    } else {
      navigateTo(`/d/${domainData?.slug || 'default'}/board?frame=index`)
    }
  }

  const handleWriteMoment = async () => {
    if (isCreatingDraft) return // Prevent double clicks

    // Ensure themeSlug is never null - default to 'neutral'
    const themeSlugSafe = themeSlug || 'neutral'

    // Get domain slug for API call - use domainData.slug if available, otherwise 'default'
    const domainSlug = domainData?.slug || 'default'
    console.log('[V0_COVERBODY_WRITE_MOMENT_FINGERPRINT]', { domainSlug, themeSlug, themeSlugSafe })


    console.log('handleWriteMoment called, themeSlug:', themeSlug, 'themeSlugSafe:', themeSlugSafe, 'domainSlug:', domainSlug)
    try {
      setIsCreatingDraft(true)
      console.log('Creating draft moment...')
      const draft = await createDraftMoment({
        themeSlug: themeSlugSafe,
        domainSlug
      })
      console.log('Draft created:', draft)

      // If we're in a domain context, navigate within domain, otherwise use /v0
      if (v0Shell) {
        v0Shell.navigateToFrame("moment", { draftId: draft.id, themeSlug: themeSlugSafe })
      } else {
        const baseUrl = domainData ? `/d/${domainData.slug}/board` : '/v0'
        const navUrl = `${baseUrl}?frame=moment&draftId=${draft.id}&theme=${themeSlugSafe}`
        console.log('Navigating to:', navUrl)
        navigateTo(navUrl)
      }
    } catch (error) {
      console.error('Failed to create draft moment:', error)
      // For now, just navigate without draft ID if API fails
      if (v0Shell) {
        v0Shell.navigateToFrame("moment", { themeSlug: themeSlugSafe })
      } else {
        const baseUrl = domainData ? `/d/${domainData.slug}/board` : '/v0'
        const navUrl = `${baseUrl}?frame=moment&theme=${themeSlugSafe}`
        console.log('Fallback navigation to:', navUrl)
        navigateTo(navUrl)
      }
    } finally {
      setIsCreatingDraft(false)
    }
  }

  const buildCoverOpenPath = () => {
    const params = new URLSearchParams()
    const theme = searchParams.get("theme")
    const style = searchParams.get("style")
    if (theme) params.set("theme", theme)
    if (style) params.set("style", style)
    params.set("coverState", "open")
    if (searchParams.has("frame")) {
      params.set("frame", "cover")
    }
    return `/d/${domainData?.slug || 'default'}/board?${params.toString()}`
  }

  const renderClosedCover = () => {
    const domainFrame = v0Shell?.domainFrame
    const designerPreview = isDesignerBoardPreviewShell(v0Shell)
    const cardType = domainFrame?.cover?.card?.type
    const resolvedAudience = v0Shell?.resolvedAudience ?? null
    const cardAvailableTo = domainFrame?.cover?.card?.available_to ?? []
    const cardVisible =
      !resolvedAudience || cardAvailableTo.length === 0 || cardAvailableTo.includes(resolvedAudience)

    // TODO: Card type variants belong in Universal Board Design View

    // journey_invitation SlideType — render from domain frame JSON (theme + forward)
    if (cardType === "journey_invitation" && domainFrame && cardVisible) {
      const chat_interface = mergeCoverChatInterface(domainFrame.cover.chat_interface)
      const coverChatSlug = domainData?.slug || v0Shell?.domainSlug || "default"

      const handleForward = async () => {
        if (forwardLoading) return
        // Destination from JSON: "journey/default" → first journey for guests, else journeys frame
        const slug = domainData?.slug || v0Shell?.domainSlug || "default"

        const navigateToJourneysFallback = () => {
          if (v0Shell) {
            v0Shell.navigateToFrame("journeys")
          } else {
            navigateTo(`/d/${slug}/board?frame=journeys`)
          }
        }

        if (isAuthenticated || designerPreview) {
          navigateToJourneysFallback()
          return
        }

        setForwardLoading(true)
        try {
          const base = getApiBase()
          const res = await fetch(`${base}/api/public/${encodeURIComponent(slug)}/journeys`)
          if (res.ok) {
            const body = (await res.json()) as { journeys?: { id: string }[] }
            const list = body.journeys ?? []
            if (list.length > 0) {
              const params = new URLSearchParams()
              params.set("frame", "journeys")
              params.set("journey", list[0].id)
              const theme = searchParams.get("theme")
              const style = searchParams.get("style")
              if (theme) params.set("theme", theme)
              if (style) params.set("style", style)
              navigate(`/d/${slug}?${params.toString()}`)
              return
            }
          }
        } catch (e) {
          console.warn("[CoverBody] public journeys fetch failed, falling back to journeys frame", e)
        } finally {
          setForwardLoading(false)
        }

        navigateToJourneysFallback()
      }

      return (
        <div className="flex w-full flex-col items-center">
          <JourneyInvitationSlide
            wordmark={domainFrame.theme.wordmark}
            tagline={domainFrame.theme.tagline}
            forwardLabel={domainFrame.forward.label}
            onForward={() => {
              void handleForward()
            }}
            forwardDisabled={forwardLoading}
          />
          <CoverChatInterface
            chat_interface={chat_interface}
            domainSlug={coverChatSlug}
            audience={resolvedAudience}
          />
        </div>
      )
    }

    // Fallback: render from domain API data (used while domainFrame is loading
    // or for domains without a frame JSON record). Designer preview uses shell domainFrame.theme.
    const useFrameTheme = Boolean(designerPreview && domainFrame?.theme)
    const isPlaceholder =
      !useFrameTheme &&
      (!domainData?.id || String(domainData.id).startsWith("fallback-"))
    const title = isPlaceholder
      ? undefined
      : useFrameTheme
        ? (domainFrame!.theme!.wordmark || domainData?.name)
        : (domainData?.name ?? undefined)
    const tagline = isPlaceholder
      ? undefined
      : useFrameTheme
        ? (domainFrame!.theme!.tagline ?? domainData?.description)
        : (domainData?.description ?? undefined)

    const fallbackChat = domainFrame
      ? mergeCoverChatInterface(domainFrame.cover.chat_interface)
      : mergeCoverChatInterface(undefined)
    const fallbackChatSlug = domainData?.slug || v0Shell?.domainSlug || "default"
    const fallbackAudience = v0Shell?.resolvedAudience ?? null

    return (
      <section
        aria-label="Cover identity"
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center"
      >
        {title ? (
          <>
            <h2 className="text-3xl md:text-4xl font-serif" style={{ color: "var(--theme-ink-primary)" }}>
              {title}
            </h2>
            {tagline && (
              <p className="text-sm leading-relaxed max-w-md" style={{ color: "var(--theme-ink-secondary)" }}>
                {tagline}
              </p>
            )}
          </>
        ) : (
          <div
            className="h-8 w-24 animate-pulse rounded"
            style={{ backgroundColor: "var(--theme-ink-tertiary)" }}
            aria-hidden
          />
        )}
        {domainFrame ? (
          <CoverChatInterface
            chat_interface={fallbackChat}
            domainSlug={fallbackChatSlug}
            audience={fallbackAudience}
          />
        ) : null}
      </section>
    )
  }

  const renderOpenCover = () => {
    return (
      <>
        <section aria-label="Opened threshold" className="mb-5 space-y-3">
          <div className="rounded-xl border px-5 py-4" style={{ borderColor: "var(--theme-border-soft)", backgroundColor: "var(--theme-surface-panel)" }}>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--theme-ink-tertiary)" }}>
              First Page
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--theme-ink-secondary)" }}>
              Choose where to begin. The Index is the calm map; Moments are the daily pulse.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenIndex}
            className="group w-full rounded-xl border px-4 py-4 text-left transition-colors"
            style={{
              borderColor: "var(--theme-border-soft)",
              backgroundColor: "var(--theme-surface-panel)",
              boxShadow: "var(--theme-shadow-soft)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--theme-ink-tertiary)" }}>
                  Table of Contents
                </p>
                <p className="text-base md:text-lg" style={{ color: "var(--theme-ink-primary)" }}>
                  Open Index
                </p>
                <p className="text-xs leading-snug" style={{ color: "var(--theme-ink-secondary)" }}>
                  Open the structured map of this domain board.
                </p>
              </div>
              <span className="transition-transform duration-150 translate-x-0 group-hover:translate-x-0.5" style={{ color: "var(--theme-ink-tertiary)" }}>
                →
              </span>
            </div>
          </button>
          <button
            type="button"
            onClick={handleWriteMoment}
            className="group w-full rounded-xl border px-4 py-4 text-left transition-colors"
            style={{
              borderColor: "var(--theme-border-soft)",
              backgroundColor: "var(--theme-surface-paper)",
              boxShadow: "var(--theme-shadow-soft)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--theme-ink-tertiary)" }}>
                  Moment
                </p>
                <p className="text-base md:text-lg" style={{ color: "var(--theme-ink-primary)" }}>
                  Write a Moment
                </p>
                <p className="text-xs leading-snug" style={{ color: "var(--theme-ink-secondary)" }}>
                  Capture your thoughts in a beautiful diary entry.
                </p>
              </div>
              <span className="transition-transform duration-150 translate-x-0 group-hover:translate-x-0.5" style={{ color: "var(--theme-ink-tertiary)" }}>
                {isCreatingDraft ? "..." : "→"}
              </span>
            </div>
          </button>
        </section>

        {/* Subtle decorative fold separator */}
        <div className="flex justify-center" aria-hidden>
          <div
            className="w-16 h-px opacity-30"
            style={{ backgroundColor: "var(--theme-line-hairline)" }}
          />
        </div>

        {/* Cover Lens sits beneath header, single-column */}
        <section aria-label="Cover Lens">
          <CoverLens items={coverItems} />
        </section>
      </>
    )
  }
  // Create navigation items for this domain
  const coverItems: CoverLensItem[] = [
    {
      title: "Act: Journeys",
      subtitle: "Follow connected stories and experiences",
      affordance: "→",
      onClick: () => {
        if (v0Shell) {
          v0Shell.navigateToFrame("journeys")
        } else {
          navigateTo(`/d/${domainData?.slug || 'default'}/board?frame=journeys`)
        }
      }
    },
    {
      title: "View Keepers",
      subtitle: "Discover memory vessels and collections",
      affordance: "→",
      onClick: () => {
        if (v0Shell) {
          v0Shell.navigateToFrame("keepers")
        } else {
          navigateTo(`/d/${domainData?.slug || 'default'}/board?frame=keepers`)
        }
      }
    },
    {
      title: "Browse Domain",
      subtitle: "See all content in this space",
      affordance: "→",
      onClick: () => {
        if (v0Shell) {
          v0Shell.navigateToFrame("feed")
        } else {
          navigateTo(`/d/${domainData?.slug || 'default'}/board?frame=feed`)
        }
      }
    },
  ]

  return coverState === "closed" ? renderClosedCover() : renderOpenCover()
}