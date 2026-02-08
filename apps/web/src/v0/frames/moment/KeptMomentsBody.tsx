"use client"

import { useEffect, useMemo, useState } from "react"
import { getKeptMoments, type KeptMomentSummary } from "../../api/v0Moments"

interface KeptMomentsBodyProps {
  domainSlug?: string
}

export function KeptMomentsBody({ domainSlug }: KeptMomentsBodyProps) {
  const [moments, setMoments] = useState<KeptMomentSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterJourneyId, setFilterJourneyId] = useState<string | "">("")

  useEffect(() => {
    const load = async () => {
      if (!domainSlug) {
        setError("Domain is required to load kept moments.")
        return
      }
      try {
        setIsLoading(true)
        setError(null)
        const data = await getKeptMoments({
          domainSlug,
          limit: 50,
          journeyId: filterJourneyId || undefined,
        })
        setMoments(data)
      } catch (err) {
        console.error("Failed to load kept moments:", err)
        setError("Failed to load kept moments.")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [domainSlug, filterJourneyId])

  // Derive distinct journeys from loaded moments for the filter dropdown
  const journeyOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of moments) {
      if (m.journeyId && m.journeyName) {
        map.set(m.journeyId, m.journeyName)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [moments])

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading kept moments...</div>
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>
  }

  if (!moments.length && !filterJourneyId) {
    return <div className="text-sm text-muted-foreground">No kept moments yet.</div>
  }

  return (
    <div className="space-y-3">
      {/* Journey filter */}
      {(journeyOptions.length > 0 || filterJourneyId) && (
        <div className="flex items-center gap-2">
          <label htmlFor="journey-filter" className="text-xs font-medium" style={{ color: "var(--theme-ink-secondary)" }}>
            Filter by Journey:
          </label>
          <select
            id="journey-filter"
            value={filterJourneyId}
            onChange={(e) => setFilterJourneyId(e.target.value)}
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--theme-border-soft)" }}
          >
            <option value="">All Journeys</option>
            {journeyOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {moments.length === 0 && filterJourneyId ? (
        <div className="text-sm text-muted-foreground">No moments in this journey.</div>
      ) : (
        moments.map((moment) => (
          <div
            key={moment.id}
            className="rounded-sm border px-4 py-3"
            style={{ borderColor: "var(--theme-border-soft)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium">{moment.title || "Untitled moment"}</div>
              {moment.journeyName && (
                <span
                  className="inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                    color: "var(--theme-ink-secondary)",
                    border: "1px solid var(--theme-border-soft)",
                  }}
                >
                  {moment.journeyName}
                </span>
              )}
            </div>
            <div className="text-xs opacity-70">
              {moment.keptAt ? new Date(moment.keptAt).toLocaleString() : "Kept"}
            </div>
            {moment.body && (
              <div className="mt-2 text-xs opacity-80">{moment.body.slice(0, 140)}</div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
