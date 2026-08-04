"use client"

import * as React from "react"
import { useSearchParams } from "react-router-dom"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"
import { PresentationBoardRenderer } from "../../../worlds/shared/BoardRenderer"
import { NarrativeFrameRenderer } from "../../../worlds/presentation/NarrativeFrameRenderer"
import type { Frame } from "../../../worlds/shared/patternUtils"
import {
  fetchPublicJourneyDetail,
  getCachedPublicJourneyDetail,
  mapPublicJourneyToNarrative,
} from "../../data/publicJourneyCache"
import { resolveDomainTreatment } from "../../treatment/resolveDomainTreatment"
import { ChronicleTreatmentShell } from "../../treatment/ChronicleTreatmentShell"

export function PresentFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { domainSlug, domainFrame } = useV0Shell()
  const treatment = React.useMemo(
    () => resolveDomainTreatment(domainFrame),
    [domainFrame],
  )
  const [searchParams] = useSearchParams()
  const journeyId = searchParams.get("journeyId")

  const initialPayload = React.useMemo(() => {
    if (!journeyId || !domainSlug) return null
    const cached = getCachedPublicJourneyDetail(domainSlug, journeyId)
    return cached ? mapPublicJourneyToNarrative(cached, domainSlug) : null
  }, [journeyId, domainSlug])

  const [journeyPayload, setJourneyPayload] = React.useState<{
    frame: Frame
    domain: Record<string, unknown>
  } | null>(initialPayload)
  const [journeyLoading, setJourneyLoading] = React.useState(Boolean(journeyId && !initialPayload))
  const [journeyError, setJourneyError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!journeyId || !domainSlug) {
      setJourneyPayload(null)
      setJourneyError(null)
      setJourneyLoading(false)
      return
    }

    const cached = getCachedPublicJourneyDetail(domainSlug, journeyId)
    if (cached) {
      setJourneyPayload(mapPublicJourneyToNarrative(cached, domainSlug))
      setJourneyLoading(false)
    } else {
      setJourneyLoading(true)
    }

    let ignore = false
    setJourneyError(null)

    void fetchPublicJourneyDetail(domainSlug, journeyId)
      .then((json) => {
        if (!ignore) {
          setJourneyPayload(mapPublicJourneyToNarrative(json, domainSlug))
        }
      })
      .catch((err: unknown) => {
        if (!ignore && !cached) {
          setJourneyError(err instanceof Error ? err.message : "Failed to load journey")
        }
      })
      .finally(() => {
        if (!ignore) setJourneyLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [journeyId, domainSlug])

  if (journeyId) {
    const title = journeyPayload?.frame.name ?? "Present"
    const showLoadingOverlay = journeyLoading && !journeyPayload

    return (
      <DesignFrame
        styleId={styleId}
        themeSlug={themeSlug}
        title={title}
        subtitle={showLoadingOverlay ? "Opening this journey…" : journeyError ?? ""}
        themeSwitcherSlot={<ThemeSwitcher />}
        framePaddingTop="0"
        hideAdminControl
        suppressAtmosphere
      >
        <ChronicleTreatmentShell treatment={treatment}>
          <div className="presentation-mode flex flex-1 min-h-[60dvh] w-full -mx-4 sm:-mx-6">
            <div className="relative w-full max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col flex-1 min-h-0">
              {showLoadingOverlay && (
                <p className="text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }} role="status">
                  Opening journey…
                </p>
              )}
              {journeyError && !journeyPayload && !journeyLoading && (
                <p className="text-sm text-red-700" role="alert">
                  {journeyError}
                </p>
              )}
              {journeyPayload && (
                <div
                  className="transition-opacity duration-300"
                  style={{ opacity: journeyLoading ? 0.92 : 1 }}
                >
                  <NarrativeFrameRenderer frame={journeyPayload.frame} domain={journeyPayload.domain} />
                </div>
              )}
            </div>
          </div>
        </ChronicleTreatmentShell>
      </DesignFrame>
    )
  }

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Present"
      subtitle="A story-first presentation surface for this domain."
      themeSwitcherSlot={<ThemeSwitcher />}
      hideAdminControl
      suppressAtmosphere
    >
      <ChronicleTreatmentShell treatment={treatment}>
        <div className="presentation-mode rounded-2xl border border-black/10 p-4 shadow-sm min-h-[50dvh]">
          <PresentationBoardRenderer domainSlug={domainSlug} />
        </div>
      </ChronicleTreatmentShell>
    </DesignFrame>
  )
}
