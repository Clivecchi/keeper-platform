"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { CoverLens, type CoverLensItem } from "./cover-lens"
import type { StyleId } from "../styles/styles"
import { StyleScope } from "../styles/StyleScope"

// Board Lens selects items; Cover Lens presents them; Cover Frame contains both.

const COVER_IMPRINT = "KE3P"

const COVER_CONSTANTS = {
  pad: "clamp(1.5rem, 5vw, 3.25rem)",
  headerGap: "clamp(1.5rem, 3vw, 2.5rem)",
  imprintSize: "0.78rem",
  titleSize: "clamp(2rem, 4vw, 2.7rem)",
  linerSize: "1rem",
  ruleWidth: "3.25rem",
}

interface DomainData {
  name: string;
  slug: string;
  description?: string;
}

export function CoverFrame({
  styleId = 'neutral',
  themeSlug,
  domainData
}: {
  styleId?: StyleId,
  themeSlug?: string | null,
  domainData?: DomainData
}) {
  const navigate = useNavigate();

  // Dynamic cover content based on domain
  const coverTitle = domainData?.name || "Welcome to Keeper";
  const coverLiner = domainData?.description || "A quiet space for your thoughts and memories";

  // Create navigation items for this domain
  const coverItems: CoverLensItem[] = [
    {
      title: "Write a Moment",
      subtitle: "Capture your thoughts in a beautiful diary entry",
      affordance: "→",
      onClick: () => navigate(`?frame=moment&theme=${themeSlug || 'diary-paper'}`)
    },
    {
      title: "Explore Journeys",
      subtitle: "Follow connected stories and experiences",
      affordance: "→",
      onClick: () => navigate(`/d/${domainData?.slug || 'default'}/journeys`)
    },
    {
      title: "View Keepers",
      subtitle: "Discover memory vessels and collections",
      affordance: "→",
      onClick: () => navigate(`/d/${domainData?.slug || 'default'}/keepers`)
    },
    {
      title: "Browse Domain",
      subtitle: "See all content in this space",
      affordance: "→",
      onClick: () => navigate(`/d/${domainData?.slug || 'default'}/feed`)
    },
  ];
  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug}>
      <main
        className="min-h-screen text-foreground"
        style={{ backgroundColor: "var(--theme-surface-page)", color: "var(--theme-ink-primary)" }}
      >
      <div className="mx-auto w-full max-w-5xl space-y-14" style={{ padding: COVER_CONSTANTS.pad }}>
        {/* Cover Frame header */}
        <header className="space-y-4" aria-label="Cover Frame">
          <p
            className="uppercase tracking-[0.42em] text-center"
            style={{ fontSize: COVER_CONSTANTS.imprintSize, color: "var(--theme-ink-tertiary)" }}
          >
            {COVER_IMPRINT}
          </p>
          <div className="flex justify-center">
            <div
              className="h-px"
              style={{ width: COVER_CONSTANTS.ruleWidth, backgroundColor: "var(--theme-line-hairline)" }}
              aria-hidden
            />
          </div>
          <div className="space-y-3 text-center" style={{ gap: COVER_CONSTANTS.headerGap }}>
            <h1
              className="font-serif"
              style={{ fontSize: COVER_CONSTANTS.titleSize, letterSpacing: "0.01em", color: "var(--theme-ink-primary)" }}
            >
              {coverTitle}
            </h1>
            <p
              className="leading-relaxed max-w-2xl mx-auto"
              style={{ fontSize: COVER_CONSTANTS.linerSize, color: "var(--theme-ink-secondary)" }}
            >
              {coverLiner}
            </p>
          </div>
        </header>

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
      </div>
    </main>
    </StyleScope>
  )
}

