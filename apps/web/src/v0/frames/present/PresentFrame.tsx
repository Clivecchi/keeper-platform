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
import { getApiBase } from "../../../lib/apiFetch"

type PublicJourneyDetail = {
  journey: {
    id: string
    name: string
    forward: string
    createdAt: string
    updatedAt: string
  }
  paths: { id: string; name: string; prelude: string }[]
  moments: { id: string; title: string; narrative: string; createdAt: string }[]
}

function mapPublicJourneyToNarrative(
  json: PublicJourneyDetail,
  domainSlug: string,
): { frame: Frame; domain: Record<string, unknown> } {
  const j = json.journey
  const first = json.moments?.[0]
  const props: Frame["props"] = [
    {
      id: `${j.id}-journey-title`,
      type: "heading",
      config: { content: j.name },
      orderIndex: 0,
    },
  ]
  let order = 1
  if (j.forward?.trim()) {
    props.push({
      id: `${j.id}-forward`,
      type: "text",
      config: { content: j.forward },
      orderIndex: order++,
    })
  }
  if (first) {
    props.push({
      id: `${first.id}-moment-title`,
      type: "heading",
      config: { content: first.title || "Moment" },
      orderIndex: order++,
    })
    props.push({
      id: `${first.id}-moment-body`,
      type: "text",
      config: { content: first.narrative || "" },
      orderIndex: order++,
    })
  }

  return {
    frame: {
      id: j.id,
      name: j.name,
      pattern: "canvas",
      visibility: "public",
      props,
    },
    domain: {
      id: domainSlug,
      slug: domainSlug,
      name: j.name,
    },
  }
}

export function PresentFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { domainSlug } = useV0Shell()
  const [searchParams] = useSearchParams()
  const journeyId = searchParams.get("journeyId")

  const [journeyPayload, setJourneyPayload] = React.useState<{ frame: Frame; domain: Record<string, unknown> } | null>(
    null,
  )
  const [journeyLoading, setJourneyLoading] = React.useState(false)
  const [journeyError, setJourneyError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!journeyId || !domainSlug) {
      setJourneyPayload(null)
      setJourneyError(null)
      return
    }
    let ignore = false
    setJourneyLoading(true)
    setJourneyError(null)
    setJourneyPayload(null)
    const base = getApiBase()
    fetch(
      `${base}/api/public/${encodeURIComponent(domainSlug)}/journeys/${encodeURIComponent(journeyId)}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error(`Journey could not be loaded (${r.status})`)
        return r.json() as Promise<PublicJourneyDetail>
      })
      .then((json) => {
        if (!ignore) setJourneyPayload(mapPublicJourneyToNarrative(json, domainSlug))
      })
      .catch((err: unknown) => {
        if (!ignore) {
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

    return (
      <DesignFrame
        styleId={styleId}
        themeSlug={themeSlug}
        title={title}
        subtitle={journeyLoading ? "Loading this journey…" : journeyError ?? ""}
        themeSwitcherSlot={<ThemeSwitcher />}
        framePaddingTop="0"
      >
        <div className="presentation-mode presentation-warm flex flex-1 min-h-[70vh] w-full -mx-4 sm:-mx-6">
          <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col flex-1 min-h-0">
            {journeyLoading && (
              <p className="text-sm text-stone-600" role="status">
                Loading journey…
              </p>
            )}
            {journeyError && !journeyLoading && (
              <p className="text-sm text-red-700" role="alert">
                {journeyError}
              </p>
            )}
            {journeyPayload && !journeyLoading && (
              <NarrativeFrameRenderer frame={journeyPayload.frame} domain={journeyPayload.domain} />
            )}
          </div>
        </div>
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
    >
      <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
        <PresentationBoardRenderer domainSlug={domainSlug} />
      </div>
    </DesignFrame>
  )
}
