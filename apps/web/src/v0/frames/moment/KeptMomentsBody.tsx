"use client"

import { useEffect, useState } from "react"
import { getKeptMoments, type KeptMomentSummary } from "../../api/v0Moments"

interface KeptMomentsBodyProps {
  domainSlug?: string
}

export function KeptMomentsBody({ domainSlug }: KeptMomentsBodyProps) {
  const [moments, setMoments] = useState<KeptMomentSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!domainSlug) {
        setError("Domain is required to load kept moments.")
        return
      }
      try {
        setIsLoading(true)
        setError(null)
        const data = await getKeptMoments({ domainSlug, limit: 10 })
        setMoments(data)
      } catch (err) {
        console.error("Failed to load kept moments:", err)
        setError("Failed to load kept moments.")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [domainSlug])

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading kept moments...</div>
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>
  }

  if (!moments.length) {
    return <div className="text-sm text-muted-foreground">No kept moments yet.</div>
  }

  return (
    <div className="space-y-3">
      {moments.map((moment) => (
        <div key={moment.id} className="rounded-sm border px-4 py-3" style={{ borderColor: "var(--theme-border-soft)" }}>
          <div className="text-sm font-medium">{moment.title}</div>
          <div className="text-xs opacity-70">
            {moment.keptAt ? new Date(moment.keptAt).toLocaleString() : "Kept"}
          </div>
          {moment.body && (
            <div className="mt-2 text-xs opacity-80">{moment.body.slice(0, 140)}</div>
          )}
        </div>
      ))}
    </div>
  )
}
