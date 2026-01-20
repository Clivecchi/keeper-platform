"use client"

import { useState } from "react"
import { CoverLens, type CoverLensItem } from "../../components/cover-lens"
import { createDraftMoment } from "../../api/v0Moments"
import { useV0ShellOptional } from "../../shell/V0ShellContext"

interface CoverBodyProps {
  /** Domain data for navigation */
  domainData?: {
    name: string
    slug: string
    description?: string
  }
  /** Theme slug for navigation */
  themeSlug?: string | null
  /** Navigation callback */
  onNavigate?: (path: string) => void
}

export function CoverBody({ domainData, themeSlug, onNavigate }: CoverBodyProps) {
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)
  const v0Shell = useV0ShellOptional()
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
  // Create navigation items for this domain
  const coverItems: CoverLensItem[] = [
    {
      title: "Write a Moment",
      subtitle: "Capture your thoughts in a beautiful diary entry",
      affordance: isCreatingDraft ? "..." : "→",
      onClick: handleWriteMoment
    },
    {
      title: "Explore Journeys",
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

  return (
    <>
      <section aria-label="Domain index entrypoint" className="mb-5">
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
                Explore the structured map of this domain board.
              </p>
            </div>
            <span className="transition-transform duration-150 translate-x-0 group-hover:translate-x-0.5" style={{ color: "var(--theme-ink-tertiary)" }}>
              →
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