"use client"

import { CoverLens, type CoverLensItem } from "../../components/cover-lens"

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
  // Create navigation items for this domain
  const coverItems: CoverLensItem[] = [
    {
      title: "Write a Moment",
      subtitle: "Capture your thoughts in a beautiful diary entry",
      affordance: "→",
      onClick: () => {
        const params = new URLSearchParams()
        params.set('frame', 'moment')
        if (themeSlug && themeSlug !== 'neutral') {
          params.set('theme', themeSlug)
        }
        onNavigate?.(`?${params.toString()}`)
      }
    },
    {
      title: "Explore Journeys",
      subtitle: "Follow connected stories and experiences",
      affordance: "→",
      onClick: () => onNavigate?.(`/d/${domainData?.slug || 'default'}/journeys`)
    },
    {
      title: "View Keepers",
      subtitle: "Discover memory vessels and collections",
      affordance: "→",
      onClick: () => onNavigate?.(`/d/${domainData?.slug || 'default'}/keepers`)
    },
    {
      title: "Browse Domain",
      subtitle: "See all content in this space",
      affordance: "→",
      onClick: () => onNavigate?.(`/d/${domainData?.slug || 'default'}/feed`)
    },
  ]

  return (
    <>
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