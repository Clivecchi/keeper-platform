"use client"

import { useCallback, useEffect, useState } from "react"
import { X, MapPin, ChevronRight, Plus, Check } from "lucide-react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { apiFetch } from "../../../lib/api"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JourneySummary {
  id: string
  name: string
  forward: string
  createdAt: string
  momentCount: number
  pathCount: number
}

interface JourneyDetail {
  id: string
  name: string
  forward: string
  createdAt: string
  updatedAt: string
  keeper: { id: string; title: string } | null
  moment: JourneyMoment[]
  paths: { id: string; name: string }[]
  stats: {
    totalPaths: number
    totalMoments: number
  }
}

interface JourneyMoment {
  id: string
  title: string
  narrative: string
  keptAt?: string | null
  createdAt?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JourneysFrame({
  styleId = "neutral",
  themeSlug,
  domainSlug,
}: {
  styleId?: StyleId
  themeSlug?: string | null
  domainSlug?: string
}) {
  const { closeToBoard, navigateToFrame, domainFrame } = useV0Shell()
  const jf = domainFrame?.journeys
  const frameCtx = useFrameContextOptional()
  const domain = frameCtx?.domain
  const activeJourneyId = frameCtx?.selection.activeJourneyId ?? null

  // ---- state ----
  const [journeys, setJourneys] = useState<JourneySummary[]>([])
  const [selectedJourney, setSelectedJourney] = useState<JourneyDetail | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- fetch journey list ----
  const fetchJourneys = useCallback(async () => {
    if (!domain?.id) return
    setIsLoadingList(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/journeys?domainId=${domain.id}`)
      const data = (res as any)?.data?.journeys ?? (res as any)?.journeys ?? []
      setJourneys(
        data.map((j: any) => ({
          id: j.id,
          name: j.name,
          forward: j.forward,
          createdAt: j.createdAt,
          momentCount: j.momentCount ?? j.Moment?.length ?? 0,
          pathCount: j.pathCount ?? j.Path?.length ?? 0,
        })),
      )
    } catch (err) {
      console.error("[JourneysFrame] Failed to load journeys:", err)
      setError(domainFrame?.journeys?.messaging.errors.failed_to_load ?? "Failed to load journeys.")
    } finally {
      setIsLoadingList(false)
    }
  }, [domain?.id])

  useEffect(() => {
    fetchJourneys()
  }, [fetchJourneys])

  // ---- fetch journey detail ----
  const fetchDetail = useCallback(async (id: string) => {
    setIsLoadingDetail(true)
    try {
      const res = await apiFetch(`/api/journeys/${id}`)
      const j = (res as any)?.data ?? res
      setSelectedJourney({
        id: j.id,
        name: j.name,
        forward: j.forward,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        keeper: j.keeper ?? null,
        moment: (j.moment ?? j.Moment ?? []).map((m: any) => ({
          id: m.id,
          title: m.title,
          narrative: m.narrative,
          keptAt: m.keptAt,
          createdAt: m.createdAt,
        })),
        paths: j.paths ?? j.Path ?? [],
        stats: j.stats ?? { totalPaths: 0, totalMoments: 0 },
      })
    } catch (err) {
      console.error("[JourneysFrame] Failed to load journey detail:", err)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  // Auto-select active journey on mount
  useEffect(() => {
    if (activeJourneyId && journeys.length > 0 && !selectedJourney) {
      fetchDetail(activeJourneyId)
    }
  }, [activeJourneyId, journeys.length, selectedJourney, fetchDetail])

  // ---- handlers ----
  const handleSelectJourney = (id: string) => {
    fetchDetail(id)
  }

  const handleSetActive = (id: string) => {
    frameCtx?.setActiveJourneyId(id)
  }

  const handleOpenMoment = (momentId: string) => {
    navigateToFrame("moment", { draftId: momentId })
  }

  // ---- render helpers ----
  const themeInk = "var(--theme-ink-primary)"
  const themeInkSecondary = "var(--theme-ink-secondary)"
  const themeBorder = "var(--theme-border-soft)"
  const themeSurface = "hsl(var(--theme-surface-paper) / 0.8)"

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title={jf?.labels.frame_title ?? "Journeys"}
      subtitle={jf?.labels.frame_subtitle ?? "Active paths and threads in this domain"}
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label="Close journeys"
          onClick={closeToBoard}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={closeToBoard}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_1.5fr]">
        {/* ---- Left: Journey List ---- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: themeInkSecondary }}
            >
              {jf?.labels.section_heading ?? "Your Journeys"}
            </h3>
            <button
              type="button"
              onClick={() => navigateToFrame("commons")}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-medium transition-colors hover:opacity-80"
              style={{ borderColor: themeBorder, color: themeInk }}
              title="Start a new journey from Commons"
            >
              <Plus className="h-3 w-3" />
              {jf?.labels.new_button ?? "New"}
            </button>
          </div>

          {isLoadingList ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl border"
                  style={{ borderColor: themeBorder, backgroundColor: themeSurface }}
                />
              ))}
            </div>
          ) : journeys.length === 0 ? (
            <div
              className="rounded-xl border border-dashed p-6 text-center text-sm"
              style={{ borderColor: themeBorder, color: themeInkSecondary }}
            >
              <MapPin className="mx-auto mb-2 h-6 w-6 opacity-40" />
              <p className="font-medium" style={{ color: themeInk }}>
                {jf?.messaging.empty_states.no_journeys_heading ?? "No journeys yet"}
              </p>
              <p className="mt-1 text-xs">
                {jf?.messaging.empty_states.no_journeys_body ?? "Start a new journey from the Commons to begin organizing your moments."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {journeys.map((j) => {
                const isActive = activeJourneyId === j.id
                const isSelected = selectedJourney?.id === j.id
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => handleSelectJourney(j.id)}
                    className="w-full rounded-xl border p-3 text-left transition-all hover:shadow-sm"
                    style={{
                      borderColor: isSelected ? themeInk : themeBorder,
                      backgroundColor: isSelected ? themeSurface : "transparent",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-medium truncate"
                            style={{ color: themeInk }}
                          >
                            {j.name}
                          </span>
                          {isActive && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                              style={{
                                backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                                color: themeInk,
                                border: `1px solid ${themeBorder}`,
                              }}
                            >
                              <Check className="h-2.5 w-2.5" />
                              {jf?.labels.active_badge ?? "Active"}
                            </span>
                          )}
                        </div>
                        <p
                          className="mt-0.5 text-xs line-clamp-2"
                          style={{ color: themeInkSecondary }}
                        >
                          {j.forward}
                        </p>
                      </div>
                      <ChevronRight
                        className="mt-1 h-4 w-4 flex-shrink-0 opacity-40"
                        style={{ color: themeInk }}
                      />
                    </div>
                    <div
                      className="mt-2 flex items-center gap-3 text-[10px]"
                      style={{ color: themeInkSecondary }}
                    >
                      <span>{j.momentCount} moment{j.momentCount !== 1 ? "s" : ""}</span>
                      <span>{j.pathCount} path{j.pathCount !== 1 ? "s" : ""}</span>
                      <span>{new Date(j.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ---- Right: Journey Detail ---- */}
        <div>
          {isLoadingDetail ? (
            <div
              className="h-64 animate-pulse rounded-xl border"
              style={{ borderColor: themeBorder, backgroundColor: themeSurface }}
            />
          ) : selectedJourney ? (
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: themeBorder, backgroundColor: themeSurface }}
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: themeInk }}>
                    {selectedJourney.name}
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: themeInkSecondary }}>
                    {selectedJourney.forward}
                  </p>
                </div>
                {activeJourneyId !== selectedJourney.id && (
                  <button
                    type="button"
                    onClick={() => handleSetActive(selectedJourney.id)}
                    className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ borderColor: themeBorder, color: themeInk }}
                  >
                    {jf?.labels.set_active_button ?? "Set as Active"}
                  </button>
                )}
              </div>

              {/* Meta */}
              <div
                className="mb-4 flex flex-wrap gap-3 text-xs"
                style={{ color: themeInkSecondary }}
              >
                {selectedJourney.keeper && (
                  <span>{jf?.messaging.meta.keeper_prefix ?? "Keeper: "}{selectedJourney.keeper.title}</span>
                )}
                <span>
                  {jf?.messaging.meta.created_prefix ?? "Created "}{new Date(selectedJourney.createdAt).toLocaleDateString()}
                </span>
                <span>
                  {selectedJourney.stats.totalMoments} moment
                  {selectedJourney.stats.totalMoments !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Moments */}
              <div>
                <h3
                  className="mb-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: themeInkSecondary }}
                >
                  {jf?.labels.moments_section_heading ?? "Moments in this Journey"}
                </h3>

                {selectedJourney.moment.length === 0 ? (
                  <p className="text-sm" style={{ color: themeInkSecondary }}>
                    {jf?.messaging.empty_states.no_moments ?? "No moments yet. Keep a moment while this journey is active to add it here."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedJourney.moment.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleOpenMoment(m.id)}
                        className="w-full rounded-lg border p-3 text-left transition-all hover:shadow-sm"
                        style={{ borderColor: themeBorder }}
                      >
                        <div className="text-sm font-medium" style={{ color: themeInk }}>
                          {m.title || (jf?.messaging.meta.untitled_moment ?? "Untitled moment")}
                        </div>
                        {m.narrative && (
                          <p
                            className="mt-1 text-xs line-clamp-2"
                            style={{ color: themeInkSecondary }}
                          >
                            {m.narrative.slice(0, 140)}
                          </p>
                        )}
                        <div className="mt-1 text-[10px]" style={{ color: themeInkSecondary }}>
                          {m.keptAt
                            ? `${jf?.messaging.meta.kept_prefix ?? "Kept "}${new Date(m.keptAt).toLocaleDateString()}`
                            : m.createdAt
                              ? new Date(m.createdAt).toLocaleDateString()
                              : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm"
              style={{ borderColor: themeBorder, color: themeInkSecondary }}
            >
              {jf?.messaging.empty_states.no_selection ?? "Select a journey to view its details and moments."}
            </div>
          )}
        </div>
      </div>
    </DesignFrame>
  )
}
