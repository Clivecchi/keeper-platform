"use client"

import type React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import type { StyleId } from "../styles/styles"
import { DesignFrame } from "../frames/DesignFrame"
import { CoverBody } from "../frames/cover/CoverBody"
import { ThemeSwitcher } from "../frames/ThemeSwitcher"

const COVER_IMPRINT = "KE3P"

const COVER_CONSTANTS = {
  pad: "clamp(1.5rem, 5vw, 3.25rem)",
  imprintSize: "0.78rem",
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
  const [searchParams] = useSearchParams();

  console.log('CoverFrame rendered, navigate function:', typeof navigate);

  // Dynamic cover content based on domain
  const coverTitle = domainData?.name || "Welcome to Keeper";
  const coverLiner = domainData?.description || "A quiet space for your thoughts and memories";

  const coverStateParam = searchParams.get("coverState") || searchParams.get("cover")
  const coverState = coverStateParam === "open" ? "open" : "closed"

  return (
    <div style={{ padding: COVER_CONSTANTS.pad }}>
      {/* Cover Frame imprint header */}
      <header className="space-y-4 mb-8" aria-label="Cover Frame">
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
      </header>

  <DesignFrame
    styleId={styleId}
    themeSlug={themeSlug}
    title={coverState === "open" ? coverTitle : undefined}
    subtitle={coverState === "open" ? coverLiner : undefined}
    themeSwitcherSlot={<ThemeSwitcher />}
  >
        <CoverBody domainData={domainData} themeSlug={themeSlug} onNavigate={navigate} coverState={coverState} />
      </DesignFrame>
    </div>
  )
}

